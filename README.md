# Review_Lens

# ReviewLens

### Understand customer reviews at a glance.

Upload a CSV to see how customers feel, what they mention most, and how opinions change over time. Search, filter, and export your results.

**Built with:** Next.js, Supabase PostgreSQL, and Vercel.

## Run locally

You’ll need Node.js 20.9 or newer and a Supabase database.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your database URL to `.env.local`. Then, in the Supabase SQL Editor, run each file in `supabase/migrations` in order. If your database is from an earlier version, run only the files it doesn’t have yet. For example, `20261028000000_label_check.sql` adds the label check.

ReviewLens uses a basic sentiment analyzer by default. Add a Gemini API key to use AI mode on Google’s free tier. No AI training is needed.

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

## Label check

To see how often ReviewLens agrees with you, add a column to your CSV with your own label for each review: `positive`, `neutral`, or `negative`. Name it something like `my_label`. On the upload page, match it to **Your label**. Spellings like `Positive`, `pos`, and `positibo` also work. Reviews you leave blank are left out of the check. Your labels are saved with the reviews but never sent to the AI.

The dashboard’s **Label check** box shows how many labels match, how often they match at each confidence level, and a table of where they differ. **See the disagreements** lists those reviews, with your label next to ReviewLens’s. Both exports include the comparison.

Without a label column, ReviewLens compares its labels with the star ratings instead: 4–5 stars count as positive, 3 as neutral, and 1–2 as negative. Stars are a rough guide, since a 5-star review can still complain.

The label check measures agreement, not accuracy. With a small sample, one review can change the result a lot.

## Privacy

There’s no sign-in yet, so anyone with access can view or delete uploads. Use sample or non-sensitive reviews for demos.
