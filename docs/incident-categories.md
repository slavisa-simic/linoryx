# Incident categories

`ReportCategory` describes the customer's symptom, such as `NO_INTERNET`.
`IncidentCategory` describes the cause found during diagnosis. Linking a report to
an incident or changing the incident category does not change the report category.

| Incident category | Meaning |
| --- | --- |
| `UNDETERMINED` | Cause is not known yet |
| `FIBER_FAILURE` | Broken or damaged fiber link |
| `GPON_FAILURE` | GPON access network problem |
| `ROUTING_FAILURE` | Routing problem |
| `EQUIPMENT_FAILURE` | Router, switch or other equipment failure |
| `WIRELESS_FAILURE` | Wireless infrastructure problem |
| `POWER_OUTAGE` | Loss of power |
| `UPSTREAM_FAILURE` | Upstream provider problem |
| `OTHER` | Other causes |

New incidents default to `UNDETERMINED` in the form and when `category` is omitted
or null in `POST /api/incidents/from-reports`. Dispatchers and administrators can
change the cause in incident details after diagnosis, using
`PATCH /api/incidents/{id}/category` with a body such as
`{"category":"FIBER_FAILURE"}`. The update requires a valid category and records
`CATEGORY_CHANGED` in the audit log. Historical incidents remain read-only.

On startup, `schema.sql` replaces the old IT categories with `UNDETERMINED` and
updates the database check constraints. Existing `OTHER` and telecom values are
preserved. Running the script again leaves these categories unchanged.
