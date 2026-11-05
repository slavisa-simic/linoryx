# Local demo data

Start Docker Desktop and the app with `docker compose up -d`, then run this from the repository root:

```powershell
node .\scripts\seed-demo.mjs
```

Node.js 22.12+ and the running Docker Compose services are required. No extra npm packages or application rebuild are needed. The script creates a database backup in `%LOCALAPPDATA%\Vigil\backups` before the first seed and prints its exact path. Existing accounts, passwords and other records are preserved.

The dataset contains:

| Records | Count |
| --- | ---: |
| Accounts | 230: 2 admins, 4 dispatchers, 24 technicians, 200 customers |
| Technician profiles | 24, including different skills, workloads and availability |
| Network nodes | 80 across Sarajevo, Banja Luka, Tuzla, Mostar, Zenica, Beograd, Novi Sad and Nis |
| Customer services and service locations | 500 each |
| Customer reports | 1,200, including 120 awaiting incident triage |
| Incidents | 180, with telecom causes, current statuses and severities |
| Incident comments | 720 |
| Audit entries | Several thousand, following the corresponding workflow events |

Locations and people are synthetic. Demo addresses contain `Demo`, node codes start with `DEMO-`, incident titles start with `[DEMO v1]`, and accounts use the reserved `demo.vigil.test` domain. Records span roughly 90 days, with recent reports and incidents for dashboard charts. Some customers and technicians are disabled; they have no assigned active reports. Some technician profiles deliberately lack coordinates to exercise missing-location states.

## Sign in

Open [localhost:8081](http://localhost:8081). These local demo accounts all use **`VigilDemo2026!`**:

| Role | Email | What to try |
| --- | --- | --- |
| Administrator | `admin@demo.vigil.test` | Users, services, network map, incidents, audit and dashboard |
| Dispatcher | `dispatcher@demo.vigil.test` | Unlinked reports, incident grouping and technician recommendations |
| Technician | `technician@demo.vigil.test` | Assigned reports, assignment locations and profile |
| Customer | `customer@demo.vigil.test` | Own services, reports and confirmation of resolved reports |

Other accounts are named `admin02`, `dispatcher02`–`dispatcher04`, `technician02`–`technician24` and `customer002`–`customer200`, all followed by `@demo.vigil.test`.

The first seed also runs one report through assignment, incident start, diagnosis (`UNDETERMINED` → `FIBER_FAILURE`), technician work, resolution, customer confirmation and closure via the application's HTTP API. Its incident is titled `[DEMO v1] Provera kompletnog toka prijave`. The bulk fixtures use one SQL transaction and do not send email alerts.

## Repeat or verify

Running the seed command again detects the existing dataset and checks it without adding duplicates or resetting your demo edits. To run only the HTTP checks:

```powershell
node .\scripts\seed-demo.mjs --check
```

Checks cover all pages of the admin lists, all four demo logins, the customer's service scope, incident comments and audit, technician workloads, recommendations and assignment locations. If you rename or remove the main demo accounts or substantially change the fixture counts, the checks may report that the expected demo scenario is missing.

The script adds data to the existing database. It does not reset or empty it. `docker compose down` preserves the database volume; rebuilding application images also preserves these records.
