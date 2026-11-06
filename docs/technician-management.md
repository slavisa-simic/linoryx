# LINORYX 2.0 technician management

The implementation extends the existing controller → service → repository structure. Controllers handle HTTP and validation, services apply permissions and business rules, and repositories scope database access. React uses the existing session, dialogs, tables, CSS and Leaflet infrastructure. No dependencies were added.

## Model and lifecycle

`TechnicianProfile` is a new entity with a unique, required one-to-one link to `User`. It stores nullable latitude, longitude, availability and location update time, plus a set of specializations. `TechnicianAvailability` and `TechnicianSpecialization` are stored as strings. Specializations use a separate element collection table.

`User` and `CustomerReport` keep their existing entity relationships. In particular, report assignments still reference `User`, so deleting a technician profile preserves historical assignments, incidents and audit entries.

Administrative role changes create or delete the profile inside the existing role-change transaction. A new profile has null operational fields and an empty skill set. Repeating a technician grant keeps the existing profile; removing and later restoring the role creates a fresh profile. Open, In progress and Resolved report assignments block removal. Existing protection for active incident assignments is also retained.

The existing administrator lock and a lock on the target user serialize account changes and assignments. Profile updates lock that same target user. The database unique constraint prevents duplicate profiles. Deleting the profile removes its specialization collection through JPA without cascading into the account or operational history.

## Database migration

The additive migration is appended to `linoryx-api/src/main/resources/schema.sql`, following the project's existing startup migration convention. Spring runs it after Hibernate schema updates.

- Creates `technician_profiles` and `technician_specializations` if absent.
- Enforces the unique user relationship, coordinate pairs and ranges, and allowed enum values.
- Backfills empty profiles for existing technician accounts using `INSERT ... ON CONFLICT DO NOTHING`.
- Leaves populated profiles unchanged on repeated startup.

No database reset, replacement fixtures or separate migration framework is required. Restarting the updated API applies the migration to an existing installation. Existing technicians must then configure My Profile before receiving new assignments.

## API

| Method | Endpoint | Access / behavior |
| --- | --- | --- |
| GET | `/api/technician-profile/me` | Technician reads their own profile. |
| PUT | `/api/technician-profile/me` | Technician updates their own coordinates, availability and skills. |
| GET | `/api/technicians/overview` | Administrator or dispatcher reads enabled technician accounts, profiles and active workload. |
| GET | `/api/reports/{id}/technician-recommendations` | Administrator or dispatcher reads ranked candidates and explanations. |
| GET | `/api/technicians/me/assignment-locations` | Technician reads only their own active report installation locations. |
| PATCH | `/api/reports/{id}/assign` | Existing endpoint now requires an enabled TECHNICIAN with AVAILABLE profile availability. |
| PATCH | `/api/users/{id}/role` | Existing role endpoint now manages profile creation and permanent deletion transactionally. |

Profile updates accept this shape:

```json
{
  "latitude": 45.25,
  "longitude": 19.84,
  "availability": "AVAILABLE",
  "specializations": ["FIBER", "GPON"]
}
```

Both coordinates may be null. Partial pairs and out-of-range values are rejected by HTTP validation and domain rules. Coordinates support up to seven decimal places; zero is valid. Changing coordinates updates the timestamp, resubmitting the same numerical coordinates keeps it, and clearing coordinates clears it. Availability may remain null and skills may be empty.

## Frontend

- `/profile`: My Profile for technicians, with exactly two manual coordinate inputs, availability, skill checkboxes and a read-only update time.
- `/technicians`: searchable and filterable technician table and read-only location map for administrators and dispatchers. Incomplete profiles stay visible with explicit empty states.
- Report assignment and reassignment open a shared recommendation dialog. A dispatcher selects a candidate and explicitly confirms the assignment. Available candidates with missing skills or coordinates appear with warnings; unavailable candidates cannot be selected.
- `/network`: administrators retain the infrastructure map and CRUD controls. Technicians see “Network — My Assignments” with their active service installation locations and report links. Dispatcher permissions remain as in the local application: incident/report operations and Technician Overview.
- `/reports?report={id}` opens the selected report using the existing report table and work actions inside the shared details dialog.
- Network nodes, technician locations and assignment locations share `MapFrame`. Overlapping operational markers share a popup. Backend assignment grouping preserves each service location and each report within it.
- Dashboard workload counts assigned reports, including Resolved reports until closure. The operator account count is labeled “Enabled technicians” to distinguish account status from manually selected availability.

The assignment map reloads when opened and when Refresh is clicked. Moving between report work and Network fetches current data. There is no cached global location inventory or background refresh.

## Recommendation algorithm

All matching and ranking lives in `TechnicianRecommendationService`.

Technology matching earns two points:

| Customer service | Matching specializations |
| --- | --- |
| FIBER | FIBER or GPON |
| DSL | DSL |
| WIRELESS | WIRELESS |

For HIGH_LATENCY and UNSTABLE_CONNECTION, ROUTING earns one additional point and can qualify as a relevant match on its own. Other report categories use the service technology alone. Multiple fiber skills do not add duplicate points.

A recommended candidate must be enabled, have the TECHNICIAN role, have AVAILABLE availability, a positive match score, and valid saved coordinates. Remaining enabled technicians appear separately with explanations. Missing profiles are represented with unset operational information.

Recommendations sort by eligibility, higher match quality, fewer active reports, shorter distance, then lower user ID. Active workload includes OPEN, IN_PROGRESS and RESOLVED. CLOSED reports are excluded. Distance uses Haversine with an Earth radius of 6,371 km; the API returns unrounded kilometers and the UI formats one decimal place. Missing coordinates produce a null distance and “Distance unavailable.” Distances are straight-line measurements.

Manual assignment is allowed for any enabled, AVAILABLE technician, including one with missing skills or coordinates. The assignment endpoint rechecks the account and availability under lock, so stale recommendations cannot bypass the rules. Assignments and reassignments use the existing report audit logging.

## Security and queries

Controller role checks and service checks both apply. Services check the current enabled account and database role, including after a role change with an older JWT. The profile update DTO has no account fields or target-user selector.

The assignment-map service derives the technician ID from the authenticated JWT subject's current account. Its dedicated repository query selects only the address, coordinates, service type and report metadata of that technician's OPEN, IN_PROGRESS and RESOLVED reports. It never loads all service locations or network nodes for filtering in React. Caller-supplied technician IDs cannot change its scope.

Technicians remain blocked from network-node inventory/CRUD, unrelated customer services, other profiles and the team overview. The map DTO contains no customer account details, topology or security data. Overview loads accounts, profiles/skills and grouped workload in bulk; assignment locations use one projection query, avoiding per-technician or per-location queries.

## Verification

Validated on Java 25, PostgreSQL 18 and the project's locked frontend dependencies:

- Backend: 264 tests passed, including profile lifecycle, idempotent migration, concurrent grants, coordinate validation, matching/ranking, assignment restrictions, map scoping/grouping, report/incident workflow and existing regression coverage.
- Frontend: 63 tests passed, including empty profiles, zero/partial/cleared coordinates, overview filtering, manual override warnings, unavailable candidates, scoped map requests, refresh and report navigation.
- Frontend lint passed.
- TypeScript checking and Vite production build passed.
- `git diff --check` passed.
- Browser verification against a separate test database covered empty-profile configuration, overview markers/popups, ranked assignment, technician installation markers, report navigation and Start work → Mark resolved.

Backend checks used a separate PostgreSQL container on localhost port 5434, without the application's database volume. No real accounts or application data were changed during verification.

## Remaining limits

Vite reports bundles larger than 500 kB, including the existing chart/PDF dependencies. The production build succeeds. This change keeps the existing startup SQL migration convention and JWT role-refresh behavior: users should sign out and back in after an administrator changes their role. Maps show saved locations and refresh on demand; the optional marker for the technician's own location is omitted from the assignment map.
