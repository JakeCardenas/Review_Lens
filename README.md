# Review_Lens

Understand your customer reviews at a glance.

ReviewLens is a web app for businesses with more reviews than time. Upload a CSV of customer reviews and it cleans the text, labels each review as positive, neutral or negative with a confidence level, finds common topics such as delivery, price and product quality, and shows the patterns on a dashboard. You can filter by date, product and rating, search individual reviews, and export the labeled reviews and a summary report.

## Stack

- **Next.js 16** (App Router and Route Handlers), TypeScript, Tailwind CSS 4
- **Supabase PostgreSQL** for uploads, reviews and results, reached only from the server
- **Vercel** for hosting
- **Sentiment**: Basic mode (the pre-trained VADER word list, runs on the server) by default, or AI mode with Anthropic's Claude API when a key is set

## How it works

1. The browser reads the CSV and suggests which columns hold the review text, date, rating and product. Only those columns are sent; columns that look personal (names, emails, IDs) are never uploaded.
2. The server checks every row, strips HTML, masks emails, phone numbers, links and long numbers, checks the language, and saves the cleaned rows.
3. The browser asks the server to analyze 25 reviews at a time and shows progress. A failed batch is retried; after three tries those reviews are marked failed with a reason, and the rest carry on.
4. The dashboard reads summaries straight from Postgres.

## Run it locally

You need Node.js 20.9 or newer and a Postgres database (a Supabase project, or a local Postgres for development).

```bash
npm install
cp .env.example .env.local
```

Set `DATABASE_URL` in `.env.local`, apply the schema once (see Supabase setup below, or run `psql "$DATABASE_URL" -f supabase/migrations/20261027000000_reviewlens_schema.sql` against a local database), then start the app:

```bash
npm run dev
```

Open http://localhost:3000 and try `public/sample-reviews.csv`, a file of 150 made-up reviews.

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test` (the tests use an in-memory Postgres, so they need no database).

## Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. On Supabase, use the **Transaction pooler** string (port 6543). Server-only: it has full database access. |
| `SENTIMENT_PROVIDER` | No | `auto` (default), `basic` or `anthropic`. `auto` uses Claude only when `ANTHROPIC_API_KEY` is set. |
| `ANTHROPIC_API_KEY` | No | Turns on AI mode. Server-only. |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-opus-5-5`. `claude-haiku-5-5` is the low-cost option. |

Use placeholders in `.env.example` only. Real values go in `.env.local` (ignored by git) and in Vercel's project settings.

## Supabase setup

1. Create a Supabase project in a region close to your users.
2. Open **SQL Editor**, paste the contents of `supabase/migrations/20261027000000_reviewlens_schema.sql` and run it. It creates the `uploads`, `reviews` and `upload_issues` tables.
3. Open **Connect**, choose **Transaction pooler**, copy the connection string, put your database password in it, and use it as `DATABASE_URL`.

Access control: the browser never talks to the database, so the app doesn't use Supabase's publishable key at all. The migration turns on Row Level Security with no policies and removes table access for the `anon` and `authenticated` roles, so the Data API returns nothing even if a key leaks. Only the server, holding `DATABASE_URL`, can read or write.

Free Supabase projects pause after about a week without activity. Open the project before a demo.

## Deploy to Vercel

1. In Vercel, choose **Add New > Project** and import this GitHub repository. Vercel detects Next.js.
2. Add `DATABASE_URL`, and optionally `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`, under **Settings > Environment Variables** for Production and Preview.
3. Deploy. Under **Settings > Functions**, set the region closest to your Supabase region.
4. This version has no sign-in, so anyone with the link can see and delete uploads. The default Standard Protection leaves the main address public. For a private demo, open **Settings > Deployment Protection**, turn on **Vercel Authentication** and choose **All Deployments** (included on Hobby). To let teammates in, share a **Shareable Link**.

On the free Hobby plan, Vercel deploys commits from the account owner. If teammates' commits are blocked, have the owner merge them or use a Pro trial.

## Sentiment and confidence

- **Basic mode** (default): the VADER word list labels reviews on the server. Nothing is sent to an AI service. It's less accurate, misses sarcasm, and never marks a label as High confidence.
- **AI mode**: set `ANTHROPIC_API_KEY`. Review text, with personal details masked, is sent to Claude 25 reviews at a time. Anthropic's commercial terms say it doesn't train models on customer content; check its current data-retention terms before uploading real customer data, and set a monthly spending limit in the Anthropic Console. Rough cost: about $0.05 per 1,000 reviews with `claude-haiku-5-5`, about $1.70 with `claude-opus-5-5`.
- **Confidence** is High, Medium or Low. It combines how clearly the model read the wording with checks for mixed opinions, very short text, mixed languages and star ratings that disagree. It is not a percentage and hasn't been measured against reviews labeled by people; hand-label a sample to check accuracy before relying on it.
- **Topics** come from a fixed list of words and phrases for eight topics (`src/lib/analysis/topics.ts`). **Keywords** are words and two-word phrases that are more common in one sentiment than the others.
- **Languages**: reviews are labeled in English. Reviews in other languages are marked "not labeled" and counted separately. Reviews mixing English with another language are labeled in AI mode with Low confidence, and left unlabeled in Basic mode.

To use a different model provider, implement the `SentimentProvider` interface in `src/lib/analysis/providers/` and select it in `config.ts` and `index.ts`. Upload processing and the dashboard don't need to change.

## Privacy

- Only the mapped review text, date, rating and product leave the browser. The original file is not stored.
- Emails, phone numbers, links, social handles and long account numbers inside reviews are masked before saving. Names written inside a review can't be detected reliably.
- Server logs don't include review text.
- Deleting an upload removes its reviews and messages.

## Limits

Up to 5 MB and 5,000 reviews per upload. English labels only. No sign-in or accounts in this version.
