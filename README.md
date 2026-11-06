<p align="center">
  <img src="linoryx-web/public/brand/linoryx-logo.svg" alt="Linoryx" width="360" />
</p>

# Linoryx — Telecom Operations Platform

Linoryx connects customer services, network infrastructure, customer reports and field technicians in one operational workspace. Customers report service problems, dispatchers group and coordinate the response, and technicians track assigned work through customer confirmation and closure.

The interface is light mode only: Inter typography, warm ivory surfaces, charcoal text and terracotta accents. The local Docker stack is implemented; hosted deployments and CI/CD are not yet provided.

## Product preview

- **Live demo:** coming soon.
- **Screenshots:** [current local screens](docs/readme/); a broader product gallery is coming soon.
- **Product walkthrough video:** coming soon.

![Linoryx dashboard with a light sidebar, warm ivory canvas and operational charts](docs/readme/dashboard.jpg)

## Existing features

| Area | Implemented behavior |
| --- | --- |
| Authentication | Registration, sign-in, BCrypt password hashing, expiring JWT sessions and role-based API authorization. Disabled accounts and changed roles are checked on authenticated requests. |
| Customer services | Provision multiple services per customer, select an installation address and network node, track service status, and terminate services while preserving their history. Customers see their own services. |
| Network | Create and manage typed network nodes with generated city/type codes, confirmed locations, map markers, search and filters. Node deletion respects service relationships. |
| Customer reports | Report a problem against an active service, filter and select reports, link them to incidents, assign technicians and track work. Customers can confirm a fix or report that the problem persists. |
| Incidents | Group eligible customer reports, set telecom categories and priorities, start incidents, add internal comments, and close incidents after their linked reports close. Historical incidents remain readable. |
| Technicians | Availability, location and specialization profiles; workload and distance recommendations; an operational team map; technicians' own profile and assignment map. |
| Dashboard | Incident activity, status, priority, category and team workload charts; closure rate and operational metrics calculated from role-scoped API responses. |
| Administration and audit | Manage roles and enabled accounts, review recorded account and workflow changes, and retain historical assignments. |
| Exports and alerts | Incident PDF and CSV export; email alerts for critical incidents and a threshold of three active high-severity incidents. SMTP configuration is required for delivery. |

Address search and geocoding use a server-side Geoapify key. Existing data remains available without a key; address lookup reports its configuration requirement. Maps use Leaflet and OpenStreetMap tiles, which require network access.

## Roles

| Role | Workspace |
| --- | --- |
| Customer (`USER`) | Own services, own reports and confirmation of resolved work. |
| Technician (`TECHNICIAN`) | Assigned reports and relevant incidents, dashboard, personal profile and assignment locations. |
| Dispatcher (`DISPATCHER`) | Operational dashboard, reports and incident coordination, technician recommendations and overview, audit logs. |
| Administrator (`ADMIN`) | Operational access plus account, customer-service and network management. |

The API enforces permissions independently of navigation visibility. Registration creates a customer account. Role-management safeguards protect the last administrator and active operational assignments.

## Workflows

A customer creates a report for an active service. An administrator or dispatcher links eligible reports to an incident, starts the incident and assigns an available technician. The assigned technician starts and resolves the report. The customer confirms the fix; an operator then closes the report. A customer who still has a problem returns the report to work in progress. The incident closes only when all linked reports are closed.

Report states are `OPEN → IN_PROGRESS → RESOLVED → CLOSED`. Incident states are `OPEN → IN_PROGRESS → CLOSED`. Each workflow records audit entries. Historical incidents retain their original metadata and are read-only in the current report-based workflow.

## Architecture and stack

```text
Browser → Nginx / React → Spring Boot REST API → PostgreSQL
                               ├─ SMTP email
                               └─ Geoapify location lookup
```

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript 6, Vite 8, CSS tokens, Lucide, Recharts, Leaflet / React Leaflet, React PDF. |
| Backend | Java 25, Spring Boot 4.1, Spring Security, JWT HS256, Spring Data JPA, validation, Spring Mail and springdoc OpenAPI. |
| Persistence | PostgreSQL 18; Hibernate schema updates and the existing additive, idempotent `schema.sql` startup migration. |
| Validation | JUnit / Spring tests against PostgreSQL; Vitest and Testing Library; Oxlint and TypeScript. |
| Local hosting | Docker Compose, Nginx and a Java runtime container. |

Controllers handle HTTP and validation, services enforce permissions and business rules, and repositories access data. The principal entities include users, technician profiles, network nodes, service locations, customer services, reports, incidents, comments and audit logs.

```text
linoryx-api/
  src/main/java/com/linoryx/api/   Feature packages and API configuration
  src/main/resources/            Application configuration and preserved migrations
  src/test/java/com/linoryx/api/  Backend tests
linoryx-web/
  src/pages/                     Application screens
  src/components/                Shared UI and feature components
  src/api/                       Typed API clients
  src/services/                  Sessions, data preparation and exports
  src/tokens.css                 Central light-only design tokens
  public/brand/                  Approved vector logo, app icons and social preview
  public/fonts/                  Self-hosted, licensed Inter fonts
scripts/                         Local demo-data utility
docs/                            Feature, branding and validation documentation
compose.yaml                     Local services and persistent database volume
```

## Run locally

Install JDK 25, Node.js 22.12+ and Docker Desktop with Linux containers. The Maven Wrapper is included. Commands below use PowerShell from the repository root.

Copy example environment files **only if the destination does not already exist**:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
if (!(Test-Path linoryx-api/.env)) { Copy-Item linoryx-api/.env.example linoryx-api/.env }
if (!(Test-Path linoryx-web/.env)) { Copy-Item linoryx-web/.env.example linoryx-web/.env }
```

Set the same `DB_PASSWORD` in the root and API environment files. Configure a random `JWT_SECRET` of at least 32 ASCII characters in `linoryx-api/.env`. Keep `VITE_API_BASE_URL=/api`; configure `MAIL_USERNAME` / `MAIL_APP_PASSWORD` for email and `GEOAPIFY_API_KEY` for location lookup. Secrets belong in ignored local environment files.

Build the applications and images:

```powershell
Push-Location linoryx-api
.\mvnw.cmd clean package -DskipTests
Pop-Location

Push-Location linoryx-web
npm.cmd ci
npm.cmd run build
Pop-Location

docker build -t linoryx-api:local ./linoryx-api
docker build -t linoryx-web:local ./linoryx-web
docker compose up -d
```

Open [the local application](http://localhost:8081) or [Swagger UI](http://localhost:8080/swagger-ui/index.html). Nginx forwards `/api` to the backend. PostgreSQL is available on loopback port 5433; API and web ports are also loopback-only.

For the first administrator on a fresh database, register your account and then bootstrap that account locally:

```powershell
docker compose exec db psql -U vigil_api_user -d vigil_db -c "UPDATE users SET role = 'ADMIN' WHERE email = 'your@example.com';"
```

Sign in again to obtain the administrator role. Use the application's Users screen for subsequent account management. Optional synthetic accounts and records are described in [demo data](docs/demo-data.md).

For development, start the database with `docker compose up -d db`, run `.\mvnw.cmd spring-boot:run` inside `linoryx-api`, and `npm.cmd run dev` inside `linoryx-web`. Vite proxies `/api` to `API_PROXY_TARGET`, normally `http://localhost:8080`. The API environment example points at PostgreSQL on port 5433.

## Testing

Use a separate database for the backend suite. Existing integration tests use transactions, and startup still applies the configured migrations.

```powershell
docker compose up -d db
# Create once; use a distinct name for an existing test database if needed.
docker compose exec db psql -U vigil_api_user -d vigil_db -c "CREATE DATABASE linoryx_test;"

Push-Location linoryx-api
$env:DB_URL = 'jdbc:postgresql://localhost:5433/linoryx_test'
.\mvnw.cmd clean verify
Remove-Item Env:DB_URL
Pop-Location

Push-Location linoryx-web
npm.cmd test
npm.cmd run lint
npm.cmd run build
Pop-Location
```

The frontend build runs TypeScript project checks before generating production assets. Backend tests cover authentication, authorization, account safeguards, provisioning, reports, incident workflows, technician management and auditing. See [rebranding validation](docs/rebrand-validation.md) for results from this change, including limitations; these are observations from a local run, not a CI guarantee.

## Upgrading an existing checkout

The modules are now `linoryx-api` and `linoryx-web`, and Java uses `com.linoryx.api`. Local environment files moved with their modules; do not replace existing secrets. Update IDE run configurations or external scripts that reference the former module paths or Maven artifact.

Rebuild the new Docker image names and run `docker compose up -d`. The Compose project identity, database name, database user and `postgres_data` volume are deliberately retained to reconnect to the existing data. Stop the stack with `docker compose down` when needed; omitting `-v` retains the database volume.

Public API paths, database tables, enum values, migration SQL and historical records are unchanged. The existing JWT issuer remains a protocol compatibility value. Saved browser sessions migrate from the old storage key to `linoryx.session`. Demo-account domains, credentials and the seed advisory lock remain stable. The Git remote and checkout directory are not renamed. See [brand guidelines and compatibility](docs/brand-guidelines.md).

## Further documentation

- [Brand, light-mode tokens and compatibility](docs/brand-guidelines.md)
- [Frontend design](docs/frontend-design.md)
- [Network nodes and customer services](docs/network-services.md)
- [Report and incident categories](docs/incident-categories.md)
- [Technician management](docs/technician-management.md)
- [Local demo data](docs/demo-data.md)

## Roadmap

Hosted demo, product screenshots, walkthrough video, cloud deployments and CI/CD remain planned. No public deployment URL is available.
