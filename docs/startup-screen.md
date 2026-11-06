# Linoryx startup screen

The startup screen uses ordinary React state, effects and a small fetch function. No new dependencies were added.

## Code structure

- `linoryx-web/src/components/startup/StartupGate.tsx`: backend checks, polling, timeouts and the exit fade.
- `linoryx-web/src/components/startup/StartupScreen.tsx`: the existing logo, animation and connection status.
- `linoryx-web/src/components/startup/StartupScreen.css`: layout, responsive styles and transitions.
- `linoryx-web/src/api/readinessApi.ts`: the public readiness request and response check.
- `linoryx-api/src/main/java/com/linoryx/api/startup/ReadinessController.java`: Spring Boot readiness status.
- `linoryx-web/src/main.tsx`: wraps the existing App in StartupGate.

The separate readiness and motion hooks were removed. StartupGate has two effects: one for polling and its timers, and one for removing the fading screen. It uses named boolean states instead of phases and callback refs. There is no custom error-boundary class, lazy loading, Suspense, external-store subscription or CPU/memory detection.

## Behavior

1. Check `GET {VITE_API_BASE_URL}/auth/readiness` immediately.
2. Wait 400 ms before displaying startup, so a fast response does not flash it.
3. Give each request four seconds. After failure, wait three seconds before retrying.
4. After 45 seconds, show connection feedback. Checks continue automatically without a retry button.
5. Open the app only after a successful HTTP response with JSON `{"status":"READY"}`.
6. Mount the app immediately and fade the startup screen for 220 ms.
7. Clear timers and abort pending requests on cleanup. Polling ends after success.

The frontend repeats the readiness request automatically, three seconds after each failed request. The backend only answers readiness requests; it cannot initiate retries while it is offline. Requests run one at a time and stop after success. A zero-delay timer lets StrictMode cancel its discarded first setup.

The request uses the same API base URL as authentication, disables caching and sends no credentials. HTML hosting pages, invalid JSON and unavailable responses do not open the app. The backend endpoint uses the existing public `/api/auth/` namespace, returns only READY or UNAVAILABLE, and disables response caching. Existing security configuration is unchanged. This is application readiness, not a continuous database health check.

## Animation

The existing SVG logo, Inter font and ivory/terracotta palette are retained. GhostFibers uses one lighter configuration for every device: two layers, 54 threads, 0.75 density, pixel ratio 1, 0.25 depth of field and 0.08 particles. Scale 1.5 and perspective 0.2 keep the ribbon's endpoint outside the visible frame on wide screens. Vignette is zero so the artwork reaches the horizontal edges; CSS still provides the vertical fade and responsive layout.

The foreground logo scales up to 432 pixels on desktop, with a 24-pixel gap before the status. This gives the brand more weight against the wide artwork. The artwork stays inside the viewport so it does not create an extra vertical scrollbar.

GhostFibers is imported normally. Its code is part of the main bundle; WebGL starts only when the startup artwork mounts. This trades the separate lazy-loaded chunk for simpler code.

At the user's request, reduced-motion checks and CSS overrides were removed. The artwork continues animating regardless of that browser/OS preference. This also removes the original component's motion-preference guard without changing its shader strings. Missing WebGL2, shader/allocation failures and context loss still keep the static logo usable. The animation's resource cleanup, hidden-tab pause and 2400-pixel render limit remain in place.

The free official [GhostFibers TypeScript/CSS source](https://github.com/DavidHDev/react-bits/tree/4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4/src/ts-default/Backgrounds/GhostFibers) is pinned to commit `4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4`. Shaders are unchanged. The full upstream license is in `linoryx-web/public/licenses/react-bits.txt` and ships in the build. The WebGL implementation is third-party rendering code; the application integration is the smaller code described above.

## Verification

Regression coverage lives in `linoryx-web/tests/startup.test.tsx`, `linoryx-web/tests/ghostFibers.test.tsx` and `linoryx-api/src/test/java/com/linoryx/api/startup/ReadinessControllerTests.java`.

Checks on 6 November 2026:

- All 102 frontend tests across eight files pass.
- Oxlint reports no errors or warnings.
- TypeScript and the Vite production build pass. Vite still warns about large application/PDF chunks.
- All 10 selected backend readiness and authentication tests pass.
- Chromium checks cover desktop/mobile rendering, automatic recovery, stopped polling and animation cleanup, online startup without flashing, and blocked WebGL. The updated production bundle was tested with reduced motion enabled: animation frames continue, the 220 ms exit remains enabled, recovery is automatic, and no retry button appears. The rebuilt Docker frontend at port 8081 also renders a moving canvas with reduced motion enabled and API/PostgreSQL stopped, without JavaScript errors.

The existing uncommitted rebrand and business workflows were preserved. A live PostgreSQL/cloud cold start was not exercised; the backend controller was tested with Spring MVC and recovery responses were simulated.

## Docker updates

`docker compose up` starts the existing local images. It does not rebuild the frontend's `dist` directory or the backend JAR. After source changes, rebuild those artifacts and their Docker images using the commands in the main README, then recreate the affected containers.

The Docker check on 6 November found an old frontend image without startup code. Both application images were rebuilt, the frontend was recreated, and the stopped API container was recreated with its new readiness endpoint. The database was left stopped.

Two small packaging fixes were needed:

- `linoryx-api/.dockerignore` now includes the renamed `linoryx-api-0.0.1-SNAPSHOT.jar`.
- `linoryx-web/nginx.conf` resolves the API hostname when handling a request, so Nginx can start while the API container is stopped. This uses Nginx's documented [variable proxy target and resolver](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

Nginx configuration validation passes with the API stopped. A real Chromium request to `http://localhost:8081/`, without intercepted API responses, confirms the startup screen and animated canvas are visible while API and PostgreSQL are stopped, with no JavaScript errors. Startup readiness is checked when the page loads; refresh the page to repeat this check after stopping the backend.
