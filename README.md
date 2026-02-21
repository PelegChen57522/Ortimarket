# potymarket (UX/UI Prototype)

Prediction market UI prototype built with Next.js 14, TypeScript, TailwindCSS, and shadcn-style components.

## Run

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Routes

- `/login` Username/password login (allowlist only, no signup)
- `/` Markets browse
- `/market/[slug]` Market detail
- `/me` Portfolio
- `/upload` WhatsApp import + LLM generation

## Environment

- `OPENROUTER_API_KEY` required for generating markets
- `OPENROUTER_MODEL` optional (defaults to `stepfun/step-3.5-flash:free`)
- `OPENROUTER_REASONING` optional (`off` or `on`, default `off`)
- `OPENROUTER_MAX_INPUT_CHARS` optional (`40000` default)
- `OPENROUTER_MAX_OUTPUT_TOKENS` optional (`3500` default)
- `OPENROUTER_STEPFUN_MAX_OUTPUT_TOKENS` optional (`12000` default)
- `OPENROUTER_REASONING_EFFORT` optional (`low` default)
- `OPENROUTER_CHUNK_SIZE_CHARS` optional (`12000` default)
- `OPENROUTER_CHUNK_OVERLAP_CHARS` optional (`1000` default)
- `OPENROUTER_MAX_CHUNKS` optional (`10` default)
- `OPENROUTER_USE_LLM_CHUNK_SUMMARY` optional (`off` default, use local chunk summarization)
- `OPENROUTER_ENABLE_HEURISTIC_FALLBACK` optional (`on` default)
- `AUTH_SECRET` required in production to sign login sessions
- `OPENROUTER_REFERER` optional (defaults to `http://localhost:3000` in development)
- `ORTIMARKET_DATA_DIR` optional storage override path

## Storage (dev)

- Raw uploads are stored at `data/raw/*.txt`
- Generated imports are stored at `data/imports/*.json`
- In serverless runtimes (for example Vercel), storage automatically falls back to `/tmp/potymarket-data` (ephemeral).
