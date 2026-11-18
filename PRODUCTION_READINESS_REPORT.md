# Urban Air Quality Assistant — Production Readiness Report

**Audit date:** 18 November 2026  
**Repository state:** supplied workspace has no `.git` directory; history and commit-level secret scanning could not be performed.

## 1. Executive summary

The application now passes its TypeScript check, six focused service tests, a Vite production build, and local production-server smoke checks. Live Open-Meteo forecast, air-quality, geocoding, and basin-grid requests returned HTTP 200 during this audit. Confirmed input-validation, malformed-response, and unsafe-negative-reading issues were corrected.

**Deployment decision: NOT READY FOR PRODUCTION.** The code can build and the production server starts locally, but the deployment environment and essential connected services are not configured or verifiable here. In particular, PostgreSQL persistence, Firebase sign-in/authorized domains, and Gemini chat were not exercised with production credentials; deployment HTTPS/proxy behavior and runtime topology are unknown. The browser and responsive-layout matrix could not be inspected.

## 2. Findings and fixes

| Severity | Finding / root cause | Status | Affected files |
| --- | --- | --- | --- |
| P2 | Open-Meteo clients accepted invalid coordinates and treated malformed/structurally incomplete HTTP 200 bodies as successful telemetry. | Fixed: range checks and explicit upstream-response errors added. | `src/services/weatherService.ts`, `src/services/airQualityService.ts`, `src/services/geocodingService.ts` |
| P2 | Geocoding accepted out-of-range coordinates from individual results; browser GPS coordinates were trusted without checking geographic bounds. | Fixed: invalid results are filtered and invalid GPS coordinates become a clear geolocation error. | `src/services/geocodingService.ts`, `src/services/geolocationService.ts` |
| P2 | Public reverse-geocode and basin-grid routes checked finiteness but accepted out-of-range coordinates, forwarding invalid requests upstream. | Fixed: both routes now return HTTP 400 before upstream calls. | `server.ts` |
| P2 | Negative pollutant/AQI values could pass numeric checks; negative indices could be classified as “Good.” | Fixed: negative pollutant values become unavailable and negative AQI values are classified as unavailable. | `src/services/airQualityService.ts`, `src/services/safetyRules.ts` |
| P2 | A deterministic rule compared an instantaneous modeled PM2.5 value with a 24-hour WHO reference and labeled the result as an annual exceedance. No valid averaging period was available. | Fixed: removed the unused, scientifically mismatched comparison. | `src/services/safetyRules.ts`, `src/App.tsx`, `server.ts` |
| P2 | The public Nominatim proxy had no response cache or request spacing and silently turned upstream failures into empty success responses. The public service requires an application-identifying User-Agent/Referer, attribution, and a maximum of one request per second across the whole application. | Improved: 24-hour rounded-coordinate cache, bounded cache size, per-process 1.1-second spacing, explicit errors, and visible attribution added. A shared rate limiter is still needed if deployed across multiple server instances. | `server.ts`, `src/App.tsx` |
| P3 | Runtime SQL environment variables were absent from the example environment file, despite saved household features depending on PostgreSQL. | Fixed: documented runtime SQL variables and optional Gemini key/port. | `.env.example` |
| P3 | SEO/Open Graph descriptions claimed Google Maps sensor-station data and real-time monitoring, while the app uses modeled Open-Meteo estimates and a spatial model grid. | Fixed: metadata now describes the actual data sources and features. | `index.html` |
| P3 | No automated test command or focused tests existed for environmental data handling. | Fixed: added a test script and six edge-case tests. | `package.json`, `tests/environment-services.test.ts` |
| P3 | Initial production JavaScript bundle exceeds Vite’s 500 kB warning threshold. | Unresolved performance limitation; no Lighthouse run or safe chunking review was possible. | Build output (no UI code changed for this item) |

## 3. Architecture inspected

- **Frontend:** React 19, TypeScript 7, Vite 8, Tailwind CSS 4; one-page dashboard/landing experience with GSAP, Three.js, Recharts, and Markdown chat rendering.
- **Backend:** Express 4 in `server.ts`; Vite middleware in development and static `dist` plus SPA fallback in production.
- **Environmental data:** browser-side Open-Meteo geocoding, forecast, and air-quality requests; server-side Open-Meteo spatial grid and best-effort Nominatim reverse locality lookup.
- **Identity/storage:** Firebase Authentication and Firestore client integration; Firebase Admin verifies server bearer tokens; Drizzle/PostgreSQL stores household profiles, saved routines, and query history.
- **AI:** optional server-side Gemini streaming endpoint, enabled only when `GEMINI_API_KEY` is configured.
- **State:** React state/context; environmental service maps cache requests for five minutes and deduplicate matching in-flight requests. The SPA uses an epoch and abort controller to guard location changes.
- **Deployment/configuration:** `npm run build` creates the frontend; `npm start` starts the production Express server. `.env.example` now documents `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`, `PORT`, and optional `GEMINI_API_KEY`.

The Firebase web API key in `firebase-applet-config.json` is client configuration, not a server secret. Its Google/Firebase API restrictions and authorized domains must still be checked in the project console. No private `.env` file was present in this workspace. Git history was unavailable for secret scanning.

## 4. API test results

| Integration | Actual result | Not verified |
| --- | --- | --- |
| Open-Meteo geocoding | Live `Hyderabad` query returned HTTP 200 with city, state, country, coordinates, and timezone. Automated test filtered malformed/out-of-range result rows. | Empty/special-character/invalid queries, 429, 5xx, malformed response from live service, and browser CORS behavior. |
| Open-Meteo forecast | Live request returned HTTP 200, `Asia/Kolkata`, current weather fields, hourly data, and three daily entries. | HTTP 400/403/429/500, timeout/disconnect, bad live JSON, and browser rendering of all values. |
| Open-Meteo air quality | Live request returned HTTP 200 with distinct `us_aqi` and `european_aqi`, PM2.5/PM10, NO2/O3/SO2/CO, and hourly data. Values are passed through separately; the app discloses modeled estimates, not ground sensors. | HTTP failure classes, malformed live response, missing pollutant values in UI, and independent validation against station observations. |
| Server basin grid | Production-mode route returned HTTP 200 and a five-node model grid for valid Hyderabad coordinates; out-of-range input returned HTTP 400. | Upstream 429/5xx, timeout and prolonged high-volume behavior. |
| Browser geolocation | Code paths inspected: explicit user click, browser error mapping, timeout, unsupported browser, invalid coordinates, manual city fallback, and best-effort reverse lookup. | Permission grant/deny/dismissal and actual device location in a browser. |
| Nominatim reverse lookup | Valid Hyderabad locality query returned HTTP 200; invalid coordinate handling returned HTTP 400. | OSM throttling under multiple app replicas and fallback behavior in a real browser. |

Open-Meteo documents its AQI outputs as distinct indices; the European index can exceed 100, so the application’s European “Extremely Poor” category above 100 is intentional. [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) The live test observed `US AQI 134` and `EAQI 61` as separate values; no conversion between scales is performed.

Open-Meteo terms distinguish its free non-commercial service from commercial plans. Confirm the intended deployment’s usage classification before launch. [Open-Meteo terms](https://open-meteo.com/en/terms)

Nominatim’s public service limits traffic to at most one request per second across the application, asks for application identification and attribution, and recommends proxying and caching. The added spacing is process-local, so multiple replicas require a shared limiter/cache or a different reverse-geocoding provider. [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)

## 5. Security review

- No server-side API secret was found in the supplied environment files; only `.env.example` was present.
- Firebase web config is necessarily shipped to the browser. Restrict its API key and review authorized domains in Firebase/Google Cloud before deployment; console settings were not available to audit.
- Firestore rules are default-deny except for the read-only connection document and owner/verified-user rules for profiles and observations. Cloud rules were not deployed or exercised.
- Server routes for user workspace operations require Firebase bearer-token verification. Database ownership filters are applied in repository queries. Authentication and database behavior were not tested against live services.
- Added `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, and a restrictive Permissions Policy; Express `X-Powered-By` is disabled.
- No unsafe HTML injection sink was found in the inspected React rendering paths. `react-markdown` is used without a raw-HTML plugin.
- No HSTS policy was added because TLS termination and reverse-proxy configuration are deployment-specific and not supplied. Confirm HTTPS termination and add HSTS at the trusted edge.
- `npm audit` against a temporary npm-resolved lock reported zero vulnerabilities. The canonical project lock is `bun.lock`; Bun was unavailable, so that lockfile’s exact dependency graph was **not** audited. An initial lock-free npm install reported eight vulnerabilities, demonstrating that package-manager resolution differed. Resolve and audit with the intended production package manager before release.
- The workspace has no `.git`; repository-history and secret-history checks were not possible.

## 6. Functional, build, and performance results

- **TypeScript:** `npm run lint` — passed (`tsc --noEmit`).
- **ESLint:** `npx eslint firestore.rules` — passed. The supplied ESLint flat config only applies its Firebase security-rules plugin to rules files; it ignores application TypeScript, so TypeScript lint coverage comes from the `tsc` script.
- **Automated tests:** `npm test` — 6 passed, 0 failed. Covers invalid coordinates, malformed successful weather response, AQI scale separation, pollutant handling, geocoding result validation, and negative AQI classification.
- **Production build:** `npm run build` — passed. Vite transformed 2,362 modules. Main JS output: **2,629.03 kB minified / 754.38 kB gzip**. Vite emitted a large-chunk warning and a forward-compatibility warning for `__dirname` in `vite.config.ts`.
- **Production server:** `NODE_ENV=production npm start` — started successfully on Node 24.22.0. Root and unknown direct path returned the SPA shell; health and basin-grid requests worked; invalid coordinates returned 400. This was a local runtime check, not a hosted deployment check.
- **Dependency audit:** temporary npm-generated resolution: 0 reported vulnerabilities. Canonical Bun lock: not verified.
- **Lighthouse:** not run; no actual Lighthouse scores are claimed.
- **Browser and viewport checks:** not run at 320/375/390/430/768/1024/1366/1920 px or in Chrome/Edge/Firefox/Safari. Browser automation could not obtain an accessible browser window in this environment.
- **Core workflows not exercised end-to-end:** Google sign-in, Firestore save/delete, PostgreSQL profile/routine/history workflows, Gemini chat stream, export, and mobile navigation.

## 7. UI/UX preservation

No redesign, theme, layout, typography, spacing, navigation, animation, or component positioning changes were made. The existing footer text now includes linked Open-Meteo/CAMS and OpenStreetMap attribution required by the data integrations. Because a real browser viewport check was blocked, small-screen wrapping of that longer footer text remains unverified.

## 8. Remaining requirements before public deployment

1. Configure and test production PostgreSQL credentials, schema/migrations, Firebase Admin identity, Firebase OAuth authorized domains, and Firestore rules.
2. Configure and exercise `GEMINI_API_KEY` if chat is part of the promised deployment; verify the configured model access and stream error handling.
3. Confirm commercial/non-commercial eligibility for Open-Meteo’s selected endpoint and expected request volume.
4. Deploy one server instance for the process-local Nominatim limiter or replace it with a shared limiter/cache; validate OSM attribution and traffic policy in the hosting topology.
5. Verify HTTPS termination, proxy headers, production host, environment injection, graceful shutdown, database health checks, and logs on the target host.
6. Run visual and keyboard regression checks in the supported browsers and required viewports; obtain real Lighthouse scores and inspect console/network errors.
7. Install using Bun from the canonical lockfile and run its security audit, or formally standardize on another package manager and commit its lockfile. Confirm there are no peer-resolution issues in the selected dependency tree.

## 9. Deployment decision

**NOT READY FOR PRODUCTION** — local code checks and core environmental API tests pass, but essential connected-service configuration, canonical-lockfile security verification, hosted HTTPS/runtime configuration, and browser/responsive regression coverage remain unverified.

## Spatial Grid follow-up — 18 November 2026

### Root cause

The frontend called `/api/basin-grid` and parsed the response as JSON without checking its media type. The `preview` script ran Vite’s static-only preview server, which had no Express API route; Vite served the SPA HTML shell with HTTP 200 for the missing API path. Parsing that HTML rejected, and the component mislabeled the parse failure as “Network unavailable reaching spatial dispersion endpoint.” The Express route itself existed and its Open-Meteo URL was valid.

### Fixes

- `package.json`: `npm run preview` now starts the Express server in production mode so built assets and `/api/*` routes share the same origin.
- `server.ts`: production mode can be selected with `--production`; the grid route validates all five coordinates, wraps longitude at the dateline, rejects polar grids that would exceed valid latitude, applies an upstream timeout, checks for exactly five structured provider rows, handles malformed JSON and upstream failures explicitly, logs failures, and disables HTTP caching.
- `src/components/AtmosphericMapSection.tsx`: requests bypass browser caching, have a 10-second timeout and cancellation on location changes/unmount, require JSON and a complete valid five-bearing response, and show actionable errors for static HTML/missing-server responses. It still renders only returned provider measurements; missing/invalid numeric values remain unavailable.

### Verification

- Reproduced the failure before the fix: Vite preview returned HTTP 200 `text/html` for `/api/basin-grid?lat=17.456&lon=78.444`.
- Tested the corrected `npm run preview`: the root page returned HTTP 200 and the same-origin grid endpoint returned HTTP 200 `application/json` with `Cache-Control: no-store`.
- The exact upstream request used `https://air-quality-api.open-meteo.com/v1/air-quality` with five comma-separated latitude and longitude values, `current=us_aqi,european_aqi,pm2_5,nitrogen_dioxide`, and `timezone=auto`. Open-Meteo returned HTTP 200 and five rows. The backend returned the five expected bearings (`CORE`, `NW`, `NE`, `SE`, `SW`) with valid coordinates.
- Two repeated preview requests each reached the route and returned HTTP 200 with fresh route timestamps. Invalid center and polar-grid requests returned HTTP 400.
- In the observed live response, all five requested points returned the same real provider values: US AQI 134, EAQI 61, PM2.5 52 µg/m³, and NO2 7.9 µg/m³ at 2026-11-18 23:30 local time. The route passes those values through; it does not fabricate directional variation. Model-cell selection/resolution can yield equal nearby estimates. [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api)
- `npm run lint`, `npm run build`, and the existing automated suite (6 tests) passed after the fix. The build retains the existing large JavaScript bundle warning.
- A real browser DevTools capture was unavailable; the exact same-origin request and response were exercised directly against the production-preview server. Upstream 429/5xx/timeout branches are implemented but were not forced against the live provider.

## Google Sign-In follow-up — 19 November 2026

### Findings

- The client imports the Firebase web configuration, initializes `getAuth`, constructs `GoogleAuthProvider`, and calls `signInWithPopup`. `onAuthStateChanged` establishes the client session.
- Authenticated API calls request `currentUser.getIdToken()` and send it in `Authorization: Bearer …`. Express routes for the user workspace require `verifyIdToken` before using the decoded UID.
- Frontend and Admin SDK read the same `projectId` from `firebase-applet-config.json`. The project ID, auth domain, app ID, and sender ID are internally consistent. The web API key is client configuration and must not be treated as a private service-account key.
- A live Firebase Identity Toolkit `accounts:createAuthUri` probe using the configured web key returned HTTP 200 and a Google `authUri`. This confirms the key is accepted by that endpoint; it does not prove that the active browser hostname is authorized or that a user can complete OAuth.
- The original sign-in failure could not be reproduced because no authentication error was captured and a real account-selection flow was not completed. Firebase Console provider/domain settings are not readable from this repository.

### Changes

- Added code-specific actionable messages for popup blocked/closed, unauthorized domain, disabled provider, invalid API key/credential, and network failure. A blocked popup now falls back to Firebase redirect sign-in; redirect results and failures are processed on app load.
- Kept strict Admin token verification. Missing/empty tokens and invalid tokens remain HTTP 401. Admin verification network/internal failures now return HTTP 503, with code-only server logs.
- No credentials, service-account keys, mock tokens, or auth bypasses were added. Firestore rules were not weakened.

### Verification and limitations

- `npm run lint`, `npm run build`, and `npm test` passed (7 tests, including the seven requested client error mappings). The build still emits the large-bundle warning documented above.
- Firebase Identity Toolkit probe: HTTP 200; `providerId=google.com`; an auth URI was returned. No account identity or credential was exposed in output.
- Local protected workspace route: absent and empty bearer token returned 401; a forged token returned 401. A valid Firebase ID token was not available, so successful Admin verification and protected-feature access were not verified.
- Real Google account selection, popup/redirect completion, browser console/network capture, and a successful ID-token-to-backend request remain **NOT VERIFIED**.
- Before deployed use, check Firebase Console → Authentication → Sign-in method (Google enabled) and Authentication → Settings → Authorized domains (the actual production hostname). Also verify the Google OAuth web client/support email in the same Firebase project. Do not add a service-account private key to the frontend or repository; use deployment ADC/secret management for any Admin operations that require credentials.
