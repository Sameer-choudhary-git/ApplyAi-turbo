# Deploy ApplyAI: Azure VM API + Vercel frontend

## 1. Prepare the Azure VM

Install Docker Engine and the Docker Compose plugin, clone this repository,
then create the production configuration:

```bash
cd ApplyAi-turbo/infra/docker
cp .env.docker .env
chmod 600 .env
```

Fill in every placeholder in `.env`. The important public URLs are:

- `FRONTEND_URL=https://<your-vercel-domain>` — allowed browser origin for API CORS.
- `PUBLIC_API_URL=https://api.<your-domain>` — public HTTPS API origin.
- `GOOGLE_REDIRECT_URI=https://api.<your-domain>/api/google-calendar/callback` — add this exact value to Google OAuth.

Use a new `COOKIE_ENCRYPTION_KEY` and place all database, Supabase service-role,
R2, and Google OAuth secrets only in this Azure `.env` file or a secret manager.

Start the services:

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/health/ping
```

Put an HTTPS reverse proxy in front of the API container. Point `api.<your-domain>`
at the VM and proxy it to `127.0.0.1:${API_HOST_PORT}`. Allow only ports 80/443
in the Azure Network Security Group; Redis remains private to Docker.

## 2. Configure Vercel

Import the repository with the project root at the repository root. The included
`vercel.json` installs workspace dependencies, builds `@applyai/web`, serves
`apps/web/dist`, and rewrites client-side routes to `index.html`.

Add these Vercel environment variables for Production, Preview, and Development
as appropriate:

```text
VITE_API_URL=https://api.<your-domain>
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase anon key>
VITE_APP_BASE_URL=https://<your-vercel-domain>
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_SENTRY=false
```

`VITE_*` variables are compiled into the frontend. Never add service-role keys,
database URLs, R2 secrets, or the cookie encryption key to Vercel.

After Vercel produces the final domain, update Azure `FRONTEND_URL` with it and
restart the API:

```bash
docker compose up -d api
```

## 3. External provider allowlists

- Add the Vercel URL to Supabase Authentication's Site URL and Redirect URLs.
- Add the Azure API callback URL to the Google OAuth redirect URI allowlist.
- If Vercel Preview deployments must call the production API, append their exact
  origins to `FRONTEND_URL` as a comma-separated list and redeploy `api`.
