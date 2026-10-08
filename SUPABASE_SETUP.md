# Supabase setup

## Local Supabase

Local Supabase requires Docker Desktop (or Podman). On Windows, Docker Desktop requires WSL 2 and administrator installation. Once Docker is running, from the NutriAI app directory run:

```powershell
npm run db:start
npm run db:status
```

The first command starts Auth, Postgres, and the Supabase API and applies [`supabase/migrations/`](supabase/migrations/). `db:status` prints the local API URL and anon key. Put those in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, keep the existing Gemini key, then restart the Vite server. Use `npm run db:stop` to stop the local stack.

## Hosted Supabase

Create a Supabase project, then open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql). This creates the profile, meal, check-in and water-log tables, plus row-level security policies that restrict each row to its signed-in owner. The profile table includes a `profile_completed` flag for the first-login setup flow.

In **Authentication → URL Configuration**, set the local site URL to `http://localhost:5173` and allow `http://localhost:5173/**` while developing. Enable email/password sign-in. If email confirmation is enabled, new users must confirm their address before signing in.

## Environment variables

Copy `.env.example` to `.env` if needed. Configure at least one AI provider; add a Groq key to enable automatic fallback. Then set these Supabase values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

For local Supabase, use the API URL and anon key printed by `npm run db:status` instead. The anon/publishable key is intended for browser use and protected by RLS. **Never put a Supabase `service_role` key in a `VITE_` variable or browser code.** Restart the app after changing `.env`.

## AI provider fallback

Gemini is tried first when `GEMINI_API_KEY` is set. If it is unavailable or returns an error, the API automatically retries with Groq. Set `GROQ_API_KEY` in `.env` to enable fallback; it can also be used by itself. `GROQ_MODEL` controls chat and text analysis, while `GROQ_VISION_MODEL` controls photo analysis. Keep both provider keys server-side and never add them to a `VITE_` variable.

## Account flow

The flow is **sign up → sign in → complete your nutrition profile → dashboard**. The profile form saves the user's name, focus, weight goal and nutrition targets before opening the dashboard. Profile settings, meals, check-ins, streaks and today's water count are stored under the authenticated user. Without the two `VITE_SUPABASE_*` values, NutriAI remains in local demo mode using browser `localStorage`.

Existing local demo data is not automatically assigned to the first signed-in account. Export or manually re-enter anything you need to keep before switching to Supabase.