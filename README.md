# Menu AI Deployment

This repo has two parts:

- `frontend/` for the Vite React app
- `src/` for the Express API

## GitHub

Push the repo to GitHub as one monorepo. Keep both `frontend/` and the backend at the root.

## Render

Use Render for the API service.

1. Create a new Render Web Service from this repository.
2. Let Render read the included [`render.yaml`](render.yaml).
3. Set these environment variables in Render:
   - `CORS_ORIGIN` to your Vercel URL, for example `https://your-app.vercel.app`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `GEMINI_API_KEY` for the AI route
   - `GEMINI_RECIPE_MODEL` if you want to override the default `gemini-2.5-flash`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `USER_EMAIL`, `USER_PASSWORD`
4. Keep the default disk-backed SQLite setup unless you plan to move to Postgres later.
5. Render health check: `/health`

Important:

- The seed script is safe to run on deploy. It skips reseeding if data already exists.
- The refresh-token cookie is configured for cross-site requests, so the Vercel frontend can talk to Render.

## Vercel

Use Vercel for the frontend.

1. Create a new Vercel project from the same GitHub repo.
2. Set the project root directory to `frontend`.
3. Do not set `VITE_API_BASE_URL` for production. The frontend will call its own origin and the included Vercel `/api/*` rewrite will forward those requests to Render.
4. Deploy.

The included [`frontend/vercel.json`](frontend/vercel.json) keeps React Router working on refresh.

## UptimeRobot

Create a monitor for your Render API:

- Type: `HTTP(s)`
- URL: `https://your-api.onrender.com/health`
- Interval: 5 minutes is fine for free plans

## Local env files

Use these examples:

- [`.env.example`](.env.example)
- [`frontend/.env.example`](frontend/.env.example)

## Recommended flow

1. Push to GitHub.
2. Deploy backend on Render.
3. Copy the Render URL into `VITE_API_BASE_URL` on Vercel.
4. Copy the Vercel URL into `CORS_ORIGIN` on Render.
5. Add UptimeRobot to the Render `/health` endpoint.
