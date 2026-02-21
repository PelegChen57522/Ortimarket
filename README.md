# OrtiMarket (UX/UI Prototype)

Prediction market UI prototype built with Next.js 14, TypeScript, TailwindCSS, and shadcn-style components.

## Run

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Routes

- `/` Markets browse
- `/market/[slug]` Market detail
- `/me` Portfolio
- `/upload` WhatsApp import + LLM generation

## Environment

- `OPENROUTER_API_KEY` required for generating markets
- `OPENROUTER_MODEL` optional (defaults to `stepfun/step-3.5-flash:free`)
- `OPENROUTER_REASONING` optional (`off` or `on`, default `off`)
- `OPENROUTER_REFERER` optional (defaults to `http://localhost:3000` in development)
- `ORTIMARKET_DATA_DIR` optional storage override path

## Storage (dev)

- Raw uploads are stored at `data/raw/*.txt`
- Generated imports are stored at `data/imports/*.json`
- In serverless runtimes (for example Vercel), storage automatically falls back to `/tmp/ortimarket-data` (ephemeral).
