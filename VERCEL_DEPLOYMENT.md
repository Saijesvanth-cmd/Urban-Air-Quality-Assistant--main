# Vercel deployment

## Project settings

Import the repository root (`.`) as one Vercel project. `vercel.json` selects Vercel's native Express framework, installs from the checked-in Bun lockfile, and runs the Vite production build. Keep **Output Directory** unset: Vite writes generated frontend files into the root `public/` directory, which Vercel serves through its CDN. The Express app is the default export in root `server.ts`; no separate API functions or API rewrites are needed. Do not set `VITE_API_BASE_URL` for this combined same-origin deployment.

Use a Node.js runtime supported by the current Vercel Express framework (Node 20 or later). The app uses Node APIs and Node PostgreSQL driver. `vercel dev` is the production-like local runner; run the build first so `public/index.html` exists.

## Vercel environment variables

Set secrets for **Production**, **Preview**, and **Development** as applicable, then redeploy after changes:

| Variable | Required | Value |
| --- | --- | --- |
| `SQL_HOST` | Yes for saved profiles | PostgreSQL hostname only |
| `SQL_USER` | Yes for saved profiles | Database username |
| `SQL_PASSWORD` | Yes for saved profiles | Database password; encrypted Vercel variable |
| `SQL_DB_NAME` | Yes for saved profiles | Database name |
| `SQL_SSL` | Provider-dependent | Set to `true` when the PostgreSQL provider requires TLS (recommended for hosted databases) |
| `FIREBASE_SERVICE_ACCOUNT` | Yes on Vercel | Complete Firebase service-account JSON as one encrypted server-only variable; use a service account for the same Firebase project as `firebase-applet-config.json` |
| `GEMINI_API_KEY` | Yes for Gemini chat | Server-only Gemini API key; never prefix with `VITE_` |
| `CORS_ORIGIN` | No, same-origin app | Leave unset/empty. If a separate browser origin is intentionally used, set its exact origin (scheme + host, no path or trailing slash) |
| `VITE_API_BASE_URL` | No, same-origin app | Leave unset/empty; same-origin `/api/...` calls are used |

`PORT` is supplied by Vercel/local runtime and needs no Vercel setting. Firebase web configuration is public client configuration and is loaded from the existing `firebase-applet-config.json`; it is not an Admin credential. Vercel does not provide Google Application Default Credentials for this app, so the server explicitly requires `FIREBASE_SERVICE_ACCOUNT` when `VERCEL=1`. Never put this variable in a `VITE_` variable or commit it.

Create or migrate the PostgreSQL schema before testing profile operations. The app creates a `pg.Pool` from the `SQL_*` values, uses a single connection per Vercel function instance to limit serverless connection fan-out, and enables certificate-verified TLS when `SQL_SSL=true`. No Drizzle migrations are automatically applied during deployment. Configure database network access so Vercel Functions can connect over TLS as required by the selected PostgreSQL host.

## Deploy and verify

1. In Vercel project settings, set **Framework Preset: Express**, **Root Directory: `.`**, and leave the **Output Directory** empty. The build and install commands are already in `vercel.json` (`bun install --frozen-lockfile`, `bun run build`).
2. Add the environment variables above, especially `FIREBASE_SERVICE_ACCOUNT` and the four PostgreSQL settings. Confirm Google sign-in's authorized domain includes the Vercel production hostname in Firebase Authentication.
3. Deploy a Preview, then verify `GET /api/health` returns JSON `{ "status": "ok" }`; `GET /api/basin-grid?lat=17.456&lon=78.444` returns five nodes; and root assets return successfully. A random browser route should return the SPA HTML while an unknown `/api/...` route returns JSON 404.
4. Sign in with Google and verify `GET /api/user/workspace` and `GET /api/user/profiles` with `Authorization: Bearer <Firebase ID token>`. Create, list, activate, and delete a test profile, then remove the test data if needed.
5. Verify Gemini chat from the UI. Check Vercel Function logs for server-side failures; logs must not print service-account JSON or API keys.
6. Promote the verified Preview to Production and repeat the checks against the production hostname.

The repository can verify local routing and public Open-Meteo behavior without production credentials. Authenticated PostgreSQL CRUD, Firebase Admin verification on Vercel, and Gemini production calls require the configured Vercel secrets and must be checked after deployment.
