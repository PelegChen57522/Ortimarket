# potymarket

Prediction market web app for friend-group chat scenarios.

Stack: Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn-style UI primitives.

## What Is Implemented

### 1) Auth-gated app (no signup)
- Login route with fixed allowlist users from `lib/auth.ts`.
- Shared prototype password check (`ort123456`) and signed session cookie.
- All main pages require session:
  - `/`
  - `/upload`
  - `/market/[slug]`
  - `/me`

### 2) WhatsApp import -> market generation
- Upload `.txt` WhatsApp export from `/upload`.
- API validates file type and size (10MB max): `POST /api/import/whatsapp`.
- Chat text is processed through generation pipeline:
  - chunking for large inputs (newest-first chunks)
  - OpenRouter call (StepFun)
  - strict JSON parsing + schema validation (zod)
  - one JSON-repair pass if needed
  - heuristic fallback if model output is empty/unusable
- Result is persisted and becomes visible in Browse/Market pages.

### 3) Markets browsing and details
- Browse page (`/`) with:
  - search
  - browse tabs
  - category/topic chips
  - filter controls
  - market cards
- Market details page (`/market/[slug]`) with:
  - snapshot, outcomes, rules, evidence
  - trade panel (desktop + mobile sheet)

### 4) Real play-money bet persistence (logged-in users only)
- Trade panel Buy/Sell now sends real API request:
  - `POST /api/markets/bet`
- Bet is validated and saved per user.
- Portfolio page (`/me`) now reads and displays saved bets for current session user.

### 5) Seeded production fallback (same data local + Vercel)
- Added seeded import JSON:
  - `seed/imports/547cbb49-0d02-463d-87b5-0fd3ed33798a.json`
- Storage loader falls back to this seed when runtime storage is empty.
- This keeps Browse populated on Vercel even when `/tmp` has no imports yet.

## Main Routes

### UI routes
- `/login` Login screen.
- `/` Markets browse.
- `/market/[slug]` Market detail.
- `/me` Portfolio (user bets table).
- `/upload` WhatsApp import screen.

### API routes
- `POST /api/auth/login` Login and set session cookie.
- `POST /api/auth/logout` Clear session cookie.
- `POST /api/import/whatsapp` Upload file, generate markets, persist import.
- `POST /api/llm/generate-markets` Direct generation endpoint (JSON body).
- `POST /api/markets/bet` Place Buy/Sell play-money bet for logged-in user.

## Data Storage

`lib/storage.ts` uses file storage.

### Local development
- Base dir: `./data`
- Imports: `data/imports/*.json`
- Raw uploads: `data/raw/*.txt`
- Bets: `data/bets/*.json` (hashed filename per username)

### Serverless runtime (Vercel/Lambda)
- Base dir: `/tmp/potymarket-data`
- This is ephemeral.
- If no runtime imports exist, seeded fallback import is used.

## Environment Variables

Defined in `.env.local.example`:

- `OPENROUTER_API_KEY=` required for LLM calls.
- `OPENROUTER_MODEL=stepfun/step-3.5-flash:free`
- `OPENROUTER_REASONING=off|on`
- `OPENROUTER_MAX_INPUT_CHARS=40000`
- `OPENROUTER_MAX_OUTPUT_TOKENS=3500`
- `OPENROUTER_STEPFUN_MAX_OUTPUT_TOKENS=12000`
- `OPENROUTER_REASONING_EFFORT=low`
- `OPENROUTER_CHUNK_SIZE_CHARS=12000`
- `OPENROUTER_CHUNK_OVERLAP_CHARS=1000`
- `OPENROUTER_MAX_CHUNKS=10`
- `OPENROUTER_USE_LLM_CHUNK_SUMMARY=off`
- `OPENROUTER_ENABLE_HEURISTIC_FALLBACK=on`
- `OPENROUTER_REFERER=http://localhost:3000` (optional)
- `OPENROUTER_REQUEST_TIMEOUT_MS=15000` (optional, code default)
- `AUTH_SECRET=` required in production
- `ORTIMARKET_DATA_DIR=` optional storage override path

## Security Behavior

- API key is read only from env (`OPENROUTER_API_KEY`), never hardcoded in code.
- Session cookie is `httpOnly`, signed (HMAC), and time-limited.
- Origin check enforced on state-changing APIs (`isAllowedOrigin`).
- Payload validation with zod in auth/generation/bet APIs.
- File import constraints:
  - `.txt` only
  - max 10MB
- Path safety checks for import IDs and usernames in storage layer.

## Run Locally

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Open:
- `http://localhost:3000/login`

## Deploy Notes (Vercel)

- Runtime file storage is not durable.
- Current behavior:
  - runtime imports/bets are saved under `/tmp/potymarket-data`
  - seeded fallback ensures Browse has initial data
- For true persistence across deployments/instances, migrate storage to a database.

## Current Limitations

- Play-money only (no payments / no real orderbook / no matching engine).
- File-based storage for bets/imports is not globally durable in serverless.
- Seeded fallback is read-only baseline data, not a substitute for persistent DB.
