# Review_Lens

# ReviewLens

### Understand customer reviews at a glance.

Upload a CSV to see how customers feel, what they mention most, and how opinions change over time. Search, filter, and export your results.

**Built with:** Next.js, Supabase PostgreSQL, and Vercel.

## Run locally

You’ll need Node.js 20.9 or newer and a Supabase project.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Put your database URL and Supabase URL and publishable key in `.env.local`. Then, in the Supabase SQL Editor, run each file in `supabase/migrations` in order. If your database is from an earlier version, run only the files it doesn’t have yet. For example, `20261029000000_accounts.sql` adds accounts and limits.

ReviewLens uses a basic sentiment analyzer by default. Add a Gemini API key to use AI mode on Google’s free tier. No AI training is needed.

## Accounts

Anyone can create an account with an email address (Gmail is fine) and a password made just for ReviewLens. ReviewLens never asks for Gmail, school (SIAS) or other passwords, and there’s no Google sign-in. Every account is the same kind of account, and each one sees and manages only its own uploads. The server checks the signed-in account on every page and action.

Uploads made before accounts existed have no owner, so nobody sees them until they are assigned. After your account is created and confirmed, open `supabase/manual/assign-existing-uploads.sql`, put your email address on the marked line, and run it in the Supabase SQL Editor. It moves only ownerless uploads, and only if exactly one confirmed account has that email. If you ever delete an account in Supabase, its uploads are deleted with it.

### Supabase settings

In the Supabase dashboard:

1. **Authentication → Sign In / Providers → Email:**
   - keep **Confirm email** turned on (ReviewLens refuses sign-ups that skip it)
   - set the minimum password length to 8
2. **Authentication → URL Configuration:**
   - set **Site URL** to your Vercel address
   - add `https://your-app.vercel.app/**` and `http://localhost:3000/**` to **Redirect URLs**
3. **Authentication → Emails → SMTP Settings:** Supabase’s built-in email sender only delivers to members of your Supabase team, at about 2 emails an hour. For anyone else to get confirmation and password-reset emails, connect your own SMTP sender. Many email services have a free tier.
4. **Authentication → Emails → Templates** (recommended): links then work on any device, not only in the browser that signed up.
   - **Confirm signup:** point the link at `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/`
   - **Reset password:** point the link at `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
5. **Authentication → Rate Limits:** sign-ups and sign-ins are limited per IP address, 30 every 5 minutes by default. Every request comes from ReviewLens’s server, so the whole app shares that limit. Raise it before a class demo where many people sign up at once.

In Vercel, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` under Settings → Environment Variables, then redeploy.

### Limits

These protect the shared Gemini free tier. Each one can be changed with an environment variable (see `.env.example`).

- Each account can start 10 uploads a day and keep 25 at a time.
- AI mode analyzes up to 2,500 reviews per account per day and 10,000 for the whole app.

When a limit is reached, analysis pauses with a message and continues after midnight Pacific time. Basic mode never counts toward the AI limits.

## AI mode with the Gemini free tier

1. In [Google AI Studio](https://aistudio.google.com/apikey), create an API key in a Google Cloud project with **no billing account linked**. With billing linked, Google charges for usage.
2. In Vercel, add `GEMINI_API_KEY` under Settings → Environment Variables. To pick a model, also add `GEMINI_MODEL`. Then redeploy.
3. Keep the key in Vercel only. Don’t put it in code, chat, or Git.

ReviewLens only allows models that are free on the Gemini API’s free tier. The default is `gemini-3.5-flash-lite`. The others are `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview`, `gemini-2.5-flash-lite`, `gemini-2.5-flash`, and `gemini-2.5-pro`. This list matches [Google’s pricing page](https://ai.google.dev/gemini-api/docs/pricing) as of October 27, 2026. Google can change it.

**Limits.** Free use has per-minute and daily limits. They apply per Google Cloud project, vary by model, aren’t guaranteed, and are shown in [AI Studio](https://aistudio.google.com/rate-limit). Each request labels up to 25 reviews. When the per-minute limit is hit, ReviewLens waits and continues. When the daily limit is used up, analysis pauses until it resets at midnight Pacific time (3 or 4 p.m. in the Philippines). ReviewLens never switches to a paid service.

**Data use.** Before any review text is sent, the upload page asks you to accept a notice. On the free tier, Google may use what you send to improve its products, and people at Google may read it. Emails, phone numbers, and links are masked first, but only upload public reviews with nothing sensitive or personal in them. See the [Gemini API terms](https://ai.google.dev/gemini-api/terms).

**Eligibility.** Google’s terms require users to be 18 or older and in a [supported region](https://ai.google.dev/gemini-api/docs/available-regions) (the Philippines is one). Apps offered to people in the European Economic Area, Switzerland, or the United Kingdom must use paid services, so this free setup isn’t meant for them.

## Languages

In AI mode, ReviewLens labels English, Tagalog, and Taglish reviews, including texting spellings like “nman” and “hndi.” The basic analyzer labels English only. Reviews in other languages are listed as not supported.

## Label check and rating alignment

To see how often ReviewLens agrees with people, add a column to your CSV with your own label for each review: `positive`, `neutral`, or `negative`. Name it something like `my_label`. On the upload page, match it to **Your label**. Spellings like `Positive`, `pos`, and `positibo` also work. Your labels are saved with the reviews but never sent to Gemini.

The dashboard’s **Label check** box shows:

- how many eligible reviews match, and how many were left out and why: no label, a label that couldn’t be read, a language ReviewLens doesn’t read, or an analysis that failed or hasn’t finished
- agreement at each confidence level
- a table of where the labels match and differ
- precision, recall, and F1 for each label

Below it, a list shows the reviews where the labels differ, with your label next to ReviewLens’s. Both exports include your labels and the comparison.

Without a label column, the dashboard shows **Rating alignment** instead. It compares ReviewLens’s labels with what each star rating suggests: 4–5 stars count as positive, 3 as neutral, and 1–2 as negative. Ratings are only a rough proxy, not labels a person checked, so this doesn’t measure accuracy.

To try it, upload `fixtures/label-check-sample.csv`: 20 made-up reviews, including one blank and one unreadable label, so you can see which reviews are left out and why.

Either way, the check measures agreement, not accuracy, and a small sample can swing a lot. See [docs/accuracy-check.md](docs/accuracy-check.md) for the pilot results and how to run a fair check.

## Privacy

Each upload belongs to the account that created it. Other accounts can’t see, export, analyze or delete it, and uploads are never made public. Use sample or non-sensitive reviews for demos. `fixtures/label-check-sample.csv` is a made-up file for trying the label check.
