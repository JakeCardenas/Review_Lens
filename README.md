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

Add your database URL to `.env.local` and apply the Supabase migration first.

ReviewLens uses a basic sentiment analyzer by default. Add an Anthropic API key to use Claude. No AI training is needed.

## Privacy

There’s no sign-in yet, so anyone with access can view or delete uploads. Use sample or non-sensitive reviews for demos.
