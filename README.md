# Trivo

A personal, mobile-first web app for triathlon training. It syncs activities from
Strava, tracks body weight and gym workouts, visualizes progress across swim,
bike, run, and strength, and generates rule-based training plans based on your
level, race goal, and available training time.

Built with Next.js (App Router) + TypeScript, Tailwind CSS, and Prisma +
PostgreSQL. Add it to your phone's home screen — it's a PWA.

> **Invite-only signup.** Anyone can reach `/signup`, but creating an account
> requires the `SIGNUP_INVITE_CODE` you set — without it, signup is closed.
> Each account only ever sees its own data (body weight, training plans,
> Strava connection); there's no cross-account access.

## Features

- **Strava sync** — connect your Strava account and pull in swim/bike/run/strength
  activities.
- **Body tracking** — log daily weight (+ optional body fat %), see the trend.
- **Gym module** — build a strength plan (days × exercises), log sets/reps/weight
  each session, track per-exercise progress over time.
- **Progress** — weekly training volume by sport, pace/speed trends, weight trend.
- **Training plan generator** — a deterministic periodization engine (base / build
  / peak / taper, with recovery weeks and brick sessions) builds a week-by-week
  plan from your chosen disciplines, level, race goal, and available days/minutes
  per week. No external API calls — it's pure rule-based logic in
  `src/lib/training/`.
- **Face ID / biometric login** — register a passkey (via WebAuthn) from
  **Settings** on any device with Face ID, Touch ID, or Android biometrics, then
  log in with a tap instead of typing a password. The face/fingerprint scan
  never leaves your device — the app only ever receives a cryptographic
  signature, never biometric data.

## Setup

### 1. Database

You need a PostgreSQL database (any host works — Neon, Supabase, Railway, or a
local/Docker Postgres). Copy `.env.example` to `.env` and set `DATABASE_URL`.

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in:

- `DATABASE_URL` — your Postgres connection string.
- `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_NAME` — creates the
  very first account (via the seed script below), before any invite code
  exists to sign up with. Real login credentials — the password is checked
  on login like any other account.
- `SIGNUP_INVITE_CODE` — required to create additional accounts at `/signup`.
  Anyone with this code can self-register their own, fully isolated account.
  Rotating it (redeploy with a new value) revokes it for everyone at once —
  there's no per-person tracking or revocation at this scale.
- `TOKEN_ENCRYPTION_KEY` — a 32-byte hex key (`openssl rand -hex 32`) used to
  encrypt your Strava tokens at rest.
- `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` / `STRAVA_REDIRECT_URI` — see below.

### 3. Register a Strava API application

Strava OAuth requires your own API app (the login/data-pull flow can't reuse
someone else's credentials):

1. Go to <https://www.strava.com/settings/api> and create an application.
2. Set **Authorization Callback Domain** to your app's host (e.g. `localhost`
   for local dev, or your production domain).
3. Copy the **Client ID** and **Client Secret** into `.env`.
4. Set `STRAVA_REDIRECT_URI` to `<your-app-url>/api/strava/callback`
   (e.g. `http://localhost:3000/api/strava/callback`).

### 4. Install, migrate, seed

```bash
npm install
npx prisma migrate deploy   # or `prisma migrate dev` in development
npx prisma db seed          # creates your first account (the owner's)
```

### 5. Run

```bash
npm run dev
```

Open the app, log in with `SEED_USER_EMAIL`/`SEED_USER_PASSWORD`, and connect
Strava from **Settings**. To let someone else use the app under their own
account, share `/signup` and your `SIGNUP_INVITE_CODE` with them.

## Deploying

The app is a standard Next.js app with a Postgres dependency, so it deploys to
Vercel + a hosted Postgres (Neon/Supabase), a Docker container, or any Node
host. `npm run build` already runs `prisma migrate deploy` before `next build`,
and `postinstall` runs `prisma generate`, so a plain Vercel deploy applies
pending migrations and regenerates the client automatically — no extra build
step needed.

### Deploying to Vercel

1. Create a Postgres database reachable from the internet (e.g.
   [Neon](https://neon.tech) or [Supabase](https://supabase.com) — both have
   free tiers). If your provider offers a **pooled** connection string (Neon's
   has `-pooler` in the hostname), use that for `DATABASE_URL` — Vercel's
   serverless functions open many short-lived connections, and a small
   Postgres plan runs out of connection slots quickly without pooling. Also
   grab the **unpooled/direct** connection string (Neon calls it
   `DATABASE_URL_UNPOOLED`) for `DIRECT_URL` — migrations need it; a pooled
   connection can't take the advisory lock `prisma migrate deploy` uses and
   times out (`P1002`).
2. Import the repo into Vercel and set these environment variables in the
   project settings (same ones as `.env.example`):
   `DATABASE_URL`, `DIRECT_URL`, `TOKEN_ENCRYPTION_KEY`, `SIGNUP_INVITE_CODE`,
   `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `SEED_USER_NAME`,
   `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`
   (`https://your-actual-vercel-url.vercel.app/api/strava/callback` — use
   your project's real generated domain, found under **Domains** in the
   Vercel dashboard, not a placeholder).
3. Deploy. The build applies migrations automatically (step above).
4. Create your account: visit `/setup` on your deployed app and tap the
   button (no terminal needed — handy from a phone). It creates (or, if it
   already exists, resets the password on) the one account defined by
   `SEED_USER_EMAIL`/`SEED_USER_PASSWORD`. Log in with those credentials at
   `/login`. If you ever forget that password, or change
   `SEED_USER_PASSWORD` and need the DB to catch up, just visit `/setup`
   again — there's a link to it from the login page too. Anyone else can
   create their own, separate account at `/signup` using
   `SIGNUP_INVITE_CODE`; `/setup` never touches those accounts.
   (Alternatively, from a computer with the repo cloned:
   `DATABASE_URL="<your production connection string>" npx prisma db seed`.)
5. Update your Strava API app's **Authorization Callback Domain** (at
   <https://www.strava.com/settings/api>) to your production domain — it can't
   stay `localhost` once you're live.

Everything else (Strava sync, training plan generation, etc.) runs as regular
Next.js server code — no separate worker or cron service required.

### Troubleshooting: build fails with "Can't resolve '@/generated/prisma/...'"

The Prisma client is generated at install time (`postinstall`) and is not
committed to git, so this means the deployment is building an **old commit**
from before that was set up. This commonly happens because clicking
**Redeploy** on an existing Vercel deployment re-runs that exact deployment's
pinned commit — it does not pull the latest commit from the branch. To build
the current commit, either push a new commit (Vercel's GitHub webhook
auto-deploys it) or start a brand new deployment from the branch rather than
redeploying an old one. Check the commit hash in the build log against
`git log` on your branch to confirm which one is actually being built.

## Project structure

- `src/app/(app)` — the app shell (bottom nav on mobile, top nav on desktop)
  and its pages: dashboard, body, training-plan, gym, progress, activities,
  settings. No auth gate — every request is treated as the single seeded
  account (`src/lib/session.ts`).
- `src/app/api/strava` — Strava OAuth connect/callback + activity sync.
- `src/lib/training` — the training plan generator (periodization, weekly
  session allocation, session descriptions).
- `prisma/schema.prisma` — the data model.
