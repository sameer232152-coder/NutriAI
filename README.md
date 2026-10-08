# NutriAI

**A friendly nutrition dashboard for tracking meals, building everyday habits, and exploring food with AI.**

NutriAI is a React web application with a Vite development server, a small Express API for AI features, and optional Supabase authentication and cloud storage. You can run the dashboard in local demo mode without Supabase, or connect a hosted/local Supabase project to save an account's profile and nutrition data.

> **Nutrition notice:** AI-generated nutrition values and meal suggestions are estimates for general information only. They are not medical advice, diagnosis, or treatment. Consult a qualified healthcare professional for individual medical or dietary needs.

## Features

- **Nutrition dashboard:** review daily calories and macronutrients, meal entries, hydration, and activity check-ins.
- **Food log:** add and remove meals, record meal details, and keep a view of the day's nutrition.
- **AI food analysis:** submit a food description or a meal photo to estimate calories, protein, carbohydrates, and fat; review the estimate before adding it to the log.
- **Nutrition chat:** ask the NutriAI food assistant practical questions about meals and everyday nutrition.
- **Meal ideas:** browse meal suggestions and add an idea to the food log.
- **Daily meal plan:** explore suggestions for weight loss, maintaining weight, or weight gain, based on the configured calorie target.
- **Progress and hydration tracking:** record daily check-ins, monitor a streak, and track glasses of water.
- **Profile and nutrition targets:** set a focus and personalize calorie and macronutrient goals.
- **Diet-plan PDF:** download a printable plan with meal suggestions and a shopping list.
- **Responsive interface:** use the dashboard on desktop and smaller screens.
- **Two data modes:** use browser `localStorage` for a quick demo, or Supabase for signed-in, user-specific cloud data.

## Technology

| Area | Technology |
| --- | --- |
| Frontend | React 19, React DOM |
| Development and production build | Vite 8, `@vitejs/plugin-react` |
| Backend API | Node.js, Express 5 |
| AI chat and food analysis | Google Gemini via `@google/genai`; Groq via its chat-completions API as a fallback/alternative |
| Authentication and cloud database | Supabase Auth, PostgreSQL, `@supabase/supabase-js`, Row Level Security (RLS) |
| PDF generation | jsPDF |
| Environment configuration | dotenv |
| Linting | Oxlint |

## How the backend works

The Express server in `server.js` runs separately from the React development server. Vite proxies requests beginning with `/api` to the API server at `http://127.0.0.1:3001`.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Reports whether an AI provider key is configured. |
| `POST /api/food-chat` | Validates chat messages and returns a nutrition-assistant response. |
| `POST /api/analyze-food` | Accepts a food description and/or supported image, then returns a structured nutrition estimate. |

The server tries Gemini first when `GEMINI_API_KEY` is configured. If Gemini is not configured or a Gemini request fails, it falls back to Groq when `GROQ_API_KEY` is available. Groq can also be used on its own. AI keys are read by the server from `.env`; they should **not** be exposed through `VITE_` variables or committed to Git.

For meal photos, the API accepts JPEG, PNG, WEBP, HEIC, and HEIF images up to 8 MB. AI nutrition estimates can be uncertain and should not be treated as exact measurements.

## Requirements

- Node.js and npm (use a current Node.js LTS release).
- An AI provider API key to use AI chat and food-analysis features.
- Supabase credentials for account sign-in and cloud persistence (optional).
- Docker Desktop or Podman only if running the local Supabase stack.

## Run locally

### 1. Get the project and install packages

```bash
git clone https://github.com/sameer232152-coder/NutriAI.git
cd NutriAI
npm install
```

### 2. Create your environment file

In PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `.env` and add at least one AI provider key:

```env
# Configure Gemini, Groq, or both.
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=qwen/qwen3.8-27b
GROQ_VISION_MODEL=qwen/qwen3.8-27b

API_PORT=3001

# Needed for Supabase sign-in and cloud data. Leave unset for local demo mode.
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Use the model names supported by the provider and your account. Keep provider keys private; `.env` is ignored by Git.

### 3. Start the app

```bash
npm run start
```

This starts both the Express API and Vite development server. Open the local URL printed by Vite, usually **http://localhost:5173**.

To run either process separately, use two terminals:

```bash
npm run api
```

```bash
npm run dev
```

Check that the API process is reachable at **http://127.0.0.1:3001/api/health**. Its `configured` field is `true` when at least one AI provider key is set.

## Supabase setup

Supabase is optional. Without both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, the app uses local demo mode and saves supported data in the current browser's `localStorage`. AI features still need an AI provider key in the server's `.env`.

### Hosted Supabase

1. Create a Supabase project.
2. In the Supabase **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).
3. In **Authentication → Providers**, enable email/password sign-in.
4. In **Authentication → URL Configuration**, set the local site URL to `http://localhost:5173` and allow `http://localhost:5173/**` for local development.
5. Copy the project's **Project URL** and **anon/publishable key** into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
6. Restart the app after changing `.env`.

The schema creates `profiles`, `meals`, `check_ins`, and `water_logs` tables. It enables RLS and defines policies so authenticated users can access only their own rows. The browser anon/publishable key is used with those policies; **never put a Supabase `service_role` key in frontend code or in a `VITE_` variable.**

If email confirmation is enabled in Supabase, a new user must confirm their email before signing in.

### Local Supabase

Local Supabase uses the Supabase CLI and requires Docker Desktop (or Podman) to be installed and running. From the project directory:

```bash
npm run db:start
npm run db:status
```

The first command starts the local services and applies migrations from [`supabase/migrations/`](supabase/migrations/). Use the API URL and anon key printed by `db:status` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then restart the app.

```bash
npm run db:stop
```

See [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) for additional Supabase notes.

## Available commands

| Command | Description |
| --- | --- |
| `npm run start` | Start the API and Vite development server together. |
| `npm run dev` | Start only the Vite development server. |
| `npm run api` | Start only the Express API. |
| `npm run build` | Create a production frontend build in `dist/`. |
| `npm run preview` | Preview the built frontend locally. |
| `npm run lint` | Run Oxlint. |
| `npm run db:start` | Start the local Supabase stack. |
| `npm run db:status` | Show local Supabase service URLs and keys. |
| `npm run db:stop` | Stop the local Supabase stack. |

Build and lint before preparing a change:

```bash
npm run lint
npm run build
```

## Project structure

```text
NutriAI/
├── public/                 # Logo, icons, and static images
├── src/
│   ├── App.jsx             # Dashboard, navigation, and nutrition tracking
│   ├── AuthScreen.jsx      # Supabase sign-up and sign-in UI
│   ├── NutritionTools.jsx  # AI food analyzer and daily meal planner
│   ├── ProfileCreation.jsx # First-login nutrition profile setup
│   ├── dietPlanPdf.js      # Downloadable diet-plan PDF
│   ├── supabase.js         # Optional Supabase client configuration
│   └── *.css              # Application styles
├── supabase/
│   ├── migrations/         # Local Supabase database migrations
│   ├── config.toml         # Supabase CLI configuration
│   └── schema.sql          # Hosted-project schema and RLS policies
├── server.js               # Express API and AI provider integration
├── .env.example            # Environment variable template
├── SUPABASE_SETUP.md       # Additional database setup guidance
└── package.json            # Dependencies and npm scripts
```

## Data and privacy notes

- Local demo data is stored in browser `localStorage`; it is not automatically transferred to a new Supabase account.
- In Supabase mode, the profile, meal log, check-ins, and water logs are stored in the configured database and protected by the included owner-based RLS policies.
- Food photos and descriptions submitted for analysis are sent by the API server to the configured AI provider. Do not upload sensitive personal information.
- Gemini and Groq API credentials belong only in the server-side `.env` file. Do not commit `.env` or expose provider credentials in frontend variables.

## License

No license file is currently included. All rights remain with the project owner unless a license is added.
