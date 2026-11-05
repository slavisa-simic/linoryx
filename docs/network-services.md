# Network nodes and customer services

The new features use the same controller, service, repository and feature-folder structure as the existing application. Controllers validate HTTP requests and check roles. Services apply the business rules inside transactions. Repositories read and write the database.

## Local configuration

Create a Geoapify project and copy its API key into your local environment file:

- Docker Compose: set `GEOAPIFY_API_KEY` in the root `.env`.
- Running the API with Maven: set `GEOAPIFY_API_KEY` in `vigil-api/.env`.

Restart the API after changing the key. No key belongs in the frontend or a `VITE_` setting. Existing features continue to work without a key; address search shows a configuration message until one is supplied.

The default provider URL is `https://api.geoapify.com`. `GEOAPIFY_BASE_URL` can override it for local provider tests. Provider configuration and the HTTP timeout live in `application.yaml`; all provider calls go through `GeoapifyClient`.

The key stays on the server. Restrict it to the server's outbound IP when possible. If you later use a browser key, create a separate one and restrict its allowed origins/domains in the [Geoapify project settings](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/).

## Using the screens

Administrators get a **Network** navigation item. Add a name, type, address and status. Choose an address suggestion, check the map, and confirm the precise marker position. You can drag the marker, click the map or use Advanced coordinates. Saving shows the backend-generated code. Search and filters apply to both the map and table. Nodes at the same coordinates share a popup that lists each node.

The existing **Users** page keeps account roles and enabled/disabled access. USER rows also show a service summary and **Assign service** / **View services** actions. Assignment pre-fills the customer, requires an explicit node choice, and defaults to Active. View services provides editing and termination. An account can have no services or several services. Disabling an account does not change its services.

Customers get **My services**, a read-only list of their own services. Technicians and dispatchers do not receive infrastructure or provisioning access.

## Location validation

`LocationPicker` is shared by both forms. It debounces autocomplete requests and displays Geoapify's result type. Every selection requires an explicit position confirmation, including building results, because geocoding precision varies.

The browser submits the selected provider place ID, coordinates and confirmation. It does not supply authoritative city, country or address fields. The API fetches that place from Geoapify again. For adjusted coordinates it also reverse geocodes the final position and compares the country, city, and any available street and house number. A mismatch is rejected; the administrator can select a more appropriate address. There is no fixed kilometre limit and no proximity rule between a service and its node.

On an edit, an unchanged saved location can be kept without another provider request. Select a suggestion to change the address or marker. Coarse results without a usable city or country, and unsupported result types, cannot be saved. Provider outages and rate limits produce a retry message without saving a partial location.

Address and map displays retain Geoapify and OpenStreetMap attribution. Geoapify permits storing geocoding results with the required source attribution; see the [geocoding storage FAQ](https://www.geoapify.com/geocoding-api/) and [attribution terms](https://www.geoapify.com/terms-and-conditions/). Keep attribution visible when reusing or exporting this data.

Maps share the attribution text from `locationData.ts` inside the map control. The Network page and location picker omit separate attribution paragraphs. Service lists retain their source notice because they display addresses without a map.

## Codes and database rules

Codes are assigned once, using the verified city's uppercase ASCII name, the type abbreviation and a number: `NOVISAD-OLT-001`. Abbreviations are OLT, RTR, SW and WBS.

`node_code_counters` has one row per city/type prefix. PostgreSQL's `INSERT ... ON CONFLICT ... RETURNING` increments the counter atomically. `NodeCodeService` reserves it in its own transaction, so even a failed node save consumes the number. Deleting a node never deletes its counter. Gaps are expected and codes are never recycled. There is no city table or city abbreviation list.

The code stays unchanged after edits, including type changes; it records the original assignment. Moving a node to a different city or country is rejected. Create a new node for that move.

Foreign keys preserve user, node and service-location references. A node referenced by any customer service, including a terminated service, cannot be deleted. Services are terminated instead of deleted. A customer with live services must have those services terminated before their account role can change. Assignment and account role changes use the existing administrator-row lock so these operations cannot race.

## API routes

| Route | Access and purpose |
| --- | --- |
| `GET /api/locations/search?query=...` | ADMIN address autocomplete |
| `GET /api/network-nodes` | ADMIN paginated node list |
| `POST /api/network-nodes` | ADMIN node creation |
| `PUT /api/network-nodes/{id}` | ADMIN node update; null location keeps the saved address |
| `DELETE /api/network-nodes/{id}` | ADMIN deletion of an unreferenced node |
| `GET /api/customer-services` | ADMIN all services; USER own services only |
| `GET /api/customer-services?customerId={id}` | ADMIN selected customer; USER may specify only their own ID |
| `POST /api/users/{customerId}/services` | ADMIN assignment to a USER account |
| `PUT /api/customer-services/{id}` | ADMIN service update; null location keeps the saved address |
| `PATCH /api/customer-services/{id}/terminate` | ADMIN termination, preserving the record |

The existing Hibernate schema update and `schema.sql` initialization create the new tables and counter alongside the current schema. No existing records are replaced.

## Checks

Run `./mvnw.cmd test` from `vigil-api` with a PostgreSQL test database configured through `DB_URL` and `DB_PASSWORD`. Run `npm.cmd test`, `npm.cmd run lint` and `npm.cmd run build` from `vigil-web`.

Tests cover concurrent counter reservations, reservations after rollback/deletion, immutable codes, city-change rejection, service ownership and role restrictions, referential integrity, shared location validation, confirmation, service summaries, and the existing account and incident workflows. Provider contract tests use a local HTTP fixture; they do not require a real Geoapify key.
