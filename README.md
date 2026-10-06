# Youssef

A social platform: feed, direct messages with voice notes, voice rooms, reels,
games (online tic-tac-toe and Voice Card Clash), creator profiles and safety
controls — plus **Jokal AI**, the idea-to-proposal assistant foundation.

## Tech stack

| Layer | Choice |
| --- | --- |
| Build | Vite 5 + TypeScript 5 (strict) |
| UI | React 18, React Router 6, Tailwind CSS 3, Framer Motion, Lucide |
| Backend | Supabase (Postgres, Auth, Realtime, Storage, Edge Functions) |
| Voice | `livekit-client` + server-side token function, WebRTC P2P for social rooms |
| AI | Supabase Edge Functions calling a provider abstraction (never from the browser) |

## Getting started

```bash
npm install
cp .env.example .env     # then fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Quality gates:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # vite build
```

## Environment variables

`.env.example` lists every variable. Only two are client-safe and both are public
by design:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The anon key is protected by Row Level Security, not by secrecy. **Never** put a
service-role key, a provider key or a LiveKit secret into a `VITE_` variable, into
`src/`, or into `public/`.

All other credentials are Supabase Edge Function secrets:

```sh
npx supabase secrets set OPENAI_API_KEY=... ANTHROPIC_API_KEY=... GEMINI_API_KEY=...
npx supabase secrets set LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=...
```

Optional tuning (safe defaults, no prices baked in): `AI_RATE_LIMIT_TEXT`,
`AI_RATE_WINDOW_TEXT`, `AI_RATE_LIMIT_IMAGE`, `AI_RATE_WINDOW_IMAGE`,
`AI_COST_PER_1K_INPUT_USD`, `AI_COST_PER_1K_OUTPUT_USD`, `AI_COST_PER_IMAGE_USD`,
`ALLOWED_ORIGINS`, and the `JOKAL_*` variables.

## Supabase

Apply the migrations in order, then deploy the functions:

```sh
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy ai-assistant
npx supabase functions deploy livekit-token
npx supabase functions deploy jokal-chat
```

Migration order matters — several later migrations narrow policies that earlier
ones created, so re-running only a subset can leave the database in a weaker
state than intended.

## AI architecture

The browser never holds a provider key. It calls an Edge Function, which:

1. requires a valid Supabase JWT (no anonymous path),
2. reserves quota through `consume_ai_quota()` in Postgres,
3. calls the provider,
4. finalises the reservation through `finalize_ai_usage()`.

```
Browser ──JWT──► Edge Function ──► consume_ai_quota() ──► ai_usage
                        │
                        └────► Provider (OpenAI / Anthropic / Gemini / …)
```

`ai_usage` is the source of truth for tokens, latency and estimated cost. The
browser can only read its own rows. Cost rates are configuration, not code, so
pricing changes never require a redeploy.

### Jokal AI (foundation)

Jokal turns an idea into a structured, reviewable proposal. It is deliberately
**not** an autonomous coding agent yet.

```
idea ─► Jokal analysis ─► clarifying questions ─► proposal ─► user review
     ─► explicit approval ─► project ─► builder (future)
```

- `supabase/functions/jokal-chat` — authenticated, rate-limited,
  provider-agnostic. It has no tools, no shell and no deployment ability.
- `src/lib/jokal/types.ts` — the shared proposal contract and a client-side
  validator used as a trust boundary.
- `src/lib/jokal/client.ts` — browser client. Holds no credentials.
- Tables: `jokal_conversations`, `jokal_messages`, `jokal_proposals`,
  `jokal_projects`, all owner-scoped by RLS.

The approval gate is enforced in the database: a project can only become
`approved` through `approve_jokal_project()`, which records who approved it and
which terms version was accepted. There is no client-side path that starts a
build.

Ownership and revenue share are **not** implemented and are not implied anywhere.
They are configurable terms that need legal review; nothing in this repository
is legal advice.

## Offline behaviour

The service worker caches the app shell and public media, while the feed snapshot
is stored per authenticated user in local storage. Auth endpoints, database
APIs, private voice notes and messages are never cached. A feed must have loaded
once while online before it can be browsed offline.

## Games and live rooms

Game scores live in `game_scores` and the weekly board includes followed
accounts. Online tic-tac-toe uses Supabase Realtime Broadcast. Social rooms use
browser WebRTC peer-to-peer audio with a public STUN server — some NAT and
firewall combinations need a TURN service for reliable production connectivity.
Voice Card Clash uses LiveKit; see `supabase/functions/livekit-token/README.md`.

## User safety and moderation

Apply `20261002140000_user_safety_and_privacy.sql` for server-enforced blocking
and content reports. To enable the moderation screen, assign
`app_metadata.role = moderator` from the Supabase Admin API in a secure server
environment. Never assign that role through client-editable user metadata.

## Deployment

`vercel.json` targets a Vite SPA: build `npm run build`, output `dist`, with
history rewrites that leave hashed assets, the service worker and the manifest
untouched. Hashed assets get immutable caching; the service worker does not.

There is no test suite yet. See the audit notes before adding one: the codebase
has no test runner, so introducing one is a deliberate decision rather than a
quick fix.
