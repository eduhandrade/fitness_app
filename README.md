# Trivo

A personal, mobile-first web app for triathlon training. It syncs activities from
Strava, tracks body weight and gym workouts, visualizes progress across swim,
bike, run, and strength, and generates rule-based training plans based on your
level, race goal, and available training time.

Built with Next.js (App Router) + TypeScript, Tailwind CSS, Prisma + PostgreSQL,
and NextAuth for a single-user login. Add it to your phone's home screen — it's
a PWA.

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
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET` — the app's base URL and a random secret
  (`openssl rand -base64 32`).
- `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` / `SEED_USER_NAME` — the single
  account this app is for. Used by the seed script below.
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
npx prisma db seed          # creates your single user account
```

### 5. Run

```bash
npm run dev
```

Open the app and sign in with `SEED_USER_EMAIL` / `SEED_USER_PASSWORD`, then
connect Strava from **Settings**.

## Deploying

The app is a standard Next.js app with a Postgres dependency, so it deploys to
Vercel + a hosted Postgres (Neon/Supabase), a Docker container, or any Node
host. Run `prisma migrate deploy` and `prisma db seed` as part of your deploy
step, and set the same environment variables as above (using your production
URL for `NEXTAUTH_URL` and `STRAVA_REDIRECT_URI`).

## Project structure

- `src/app/(auth)` — login.
- `src/app/(app)` — the authenticated app shell (bottom nav on mobile, top nav
  on desktop) and its pages: dashboard, body, training-plan, gym, progress,
  activities, settings.
- `src/app/api/strava` — Strava OAuth connect/callback + activity sync.
- `src/lib/training` — the training plan generator (periodization, weekly
  session allocation, session descriptions).
- `prisma/schema.prisma` — the data model.
