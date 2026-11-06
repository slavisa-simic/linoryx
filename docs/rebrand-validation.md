# Linoryx rebranding validation

Validated locally on **6 November 2026**. These are observed local results, not claims about a hosted deployment or CI pipeline.

## Automated checks

| Check | Actual result |
| --- | --- |
| Backend `mvnw.cmd clean verify` | **284 tests passed**, 0 failures, 0 errors, 0 skipped; executable `linoryx-api-0.0.1-SNAPSHOT.jar` built. |
| Frontend `npm.cmd test` | **81 tests passed** across 6 files, including 5 new session-migration regressions. |
| Frontend `npm.cmd run lint` | Passed with Oxlint. |
| Frontend `npm.cmd run build` | TypeScript checks and Vite production build passed. Vite retains its advisory for application/PDF chunks larger than 500 kB. |
| `npm.cmd run check:brand` | All **22** defined contrast pairs passed their WCAG AA thresholds. |
| Design-token references | No missing CSS token references in application source. |
| Java move review | All 136 original Java source/test files remain under the new namespace. Changes are limited to namespace, application class/product names and OpenAPI metadata. |
| Historical migration | `schema.sql` matches the original file byte-for-byte. |
| Module file inventory | No original non-obsolete application file is missing after the rename. Replaced logos/fonts are deliberately removed. |
| Docker | Both `linoryx-api:local` and `linoryx-web:local` images built; `docker compose config --quiet` passed; the local stack restarted with the new images. |
| Running API | `/v3/api-docs` returned HTTP 200 with Linoryx metadata and 38 documented path entries. |
| Running frontend | `http://localhost:8081` returned HTTP 200 with the Linoryx document title. |
| PostgreSQL persistence | Counts and row fingerprints matched before and after restarting the rebuilt stack across all 11 checked application tables. |

The backend suite used a separate PostgreSQL database, `linoryx_rebrand_test`, through a process-local `DB_URL` override. It did not run against the application's `vigil_db`. The initial attempt started before the isolated database existed; the complete rerun after database setup passed.

The persistence comparison covered users, network nodes, service locations, customer services, technician profiles, technician specializations, incidents, customer reports, comments, audit logs and node-code counters. It compared aggregate row hashes without printing records, password hashes or secrets. No volumes were removed.

## Browser and export checks

Used the local running API and existing accounts, first through Vite and then through the rebuilt Nginx production frontend. No fixture records were added and no workflow, profile, role or customer-service changes were saved during browser checks.

- Administrator: dashboard, report queue, incident list/details, PDF export, users, customer-service dialog, network map, technician overview and audit logs rendered successfully.
- Customer: sign-in opened My services with the appropriate role-scoped navigation and existing services.
- Technician: personal profile and assignment map rendered with technician navigation.
- Registration form rendered with the live access-card preview; no account was submitted.
- Dashboard period switching and legend visibility worked. Keyboard navigation, dialog opening and Escape dismissal were checked.
- A token created before restarting the renamed API continued to load incident details afterward.
- The incident PDF downloaded as `linoryx-incident-183.pdf`; Poppler rendering was visually inspected for the Linoryx header, Inter typography, colors, spacing and footer.
- Narrow layouts were inspected. Registration and dashboard document measurements had no page overflow at effective widths of 320, 390 and 768 CSS pixels. The desktop dashboard at 1440 CSS pixels retained its fixed light sidebar and had no page overflow. Longer account names truncate within the mobile header.
- Browser-computed typography was Inter; font loading completed; the SVG brand symbol loaded. The computed scheme was `light only`, and loaded stylesheets contained no alternative color-scheme branches. An OS-theme emulation was not performed; light-only behavior is enforced by document/CSS declarations and the absence of theme selection code.

Current local screenshots: [dashboard](readme/dashboard.jpg), [sign-in](readme/sign-in.jpg) and [incident dialog](readme/incident.jpg).

## Compatibility and limitations

The deliberately retained identifiers are documented in [brand guidelines](brand-guidelines.md): the Compose project/volume identity, PostgreSQL database/user, JWT issuer, legacy session migration key, existing demo identities/advisory lock and the historical migration comment. They are compatibility values; product titles, navigation, metadata, notifications and export names use Linoryx.

No Git remote, database table, public API path, persisted enum, historical audit entry or secret was renamed. Tests exercise the existing authentication, RBAC, NetworkNode, CustomerService, CustomerReport, Incident, technician and audit functionality. Live SMTP delivery, a public cloud deployment and a full assistive-technology audit were outside this local rebrand validation. The contrast check covers the listed design-token pairs rather than certifying every aspect of WCAG conformance.
