# Report resolution email

## Existing implementation

Spring Mail and `JavaMailSender` were already configured for Gmail SMTP using `MAIL_USERNAME` and `MAIL_APP_PASSWORD`. `IncidentService.createIncident` called `NotificationService` inside its database transaction. CRITICAL incidents emailed all enabled administrators; creating a HIGH incident emailed them when at least three HIGH incidents were OPEN or IN_PROGRESS. Both messages were plain text. Each send caught `MailException` and logged the recipient and provider exception. There were no templates, asynchronous listeners, retries or demo-mode delivery controls. Incident updates and closure did not send email.

## Current behavior

Incident creation no longer sends CRITICAL or HIGH-threshold emails. Assignment, category changes and incident/report closure do not send email.

When the assigned technician resolves an individual customer report, `CustomerReportService` publishes a `ReportResolvedEvent` containing only its ID and its service owner's email address. The existing pessimistic locks, role checks and domain transitions remain in place. Repeating resolve still rejects the request because the report must be IN_PROGRESS; it cannot publish another event. After the customer selects Still Not Working, the next successful resolution publishes a new event.

`NotificationService` listens after a successful commit using Spring's [transaction-bound event support](https://docs.spring.io/spring-framework/reference/7.1/data-access/transaction/event.html). It sends in the background using the existing Spring task executor, configured with one core worker, at most two workers and a queue of 100 tasks. SMTP socket operations have five-second timeouts. A `MailSendException` gets one retry after one second; authentication and message-preparation failures are logged without retry. Logs include the report reference, never the recipient, provider exception text or message body. Delivery failure cannot roll back the committed resolution.

`EmailService` reuses `JavaMailSender` and supplies an HTML template plus a plain-text alternative. The email includes REP-ID, RESOLVED, customer instructions and a Review Your Report link to `FRONTEND_URL/reports?report=ID`. It contains no confirmation action, personal details or authentication token. Signed-out customers sign in first and return to the selected report; existing backend ownership checks continue to apply.

Delivery uses an in-memory queue. A process crash or full queue can lose a notification; SMTP acceptance followed by a connection failure can also make a retry ambiguous. There is no durable outbox or strict exactly-once provider guarantee. This keeps delivery appropriate for the current application without adding dependencies, tables or a broker.

## Configuration

Set these in `linoryx-api/.env` and restart the API:

| Variable | Default | Purpose |
| --- | --- | --- |
| `MAIL_ENABLED` | `false` | Explicitly enables outgoing email. |
| `DEMO_MODE` | `false` | When true, blocks delivery even if MAIL_ENABLED is true. The example environment sets this to true. |
| `FRONTEND_URL` | `http://localhost:8081` | Application base URL, without a path or query; use the public HTTPS URL when hosted. For Vite development, use its local URL. |
| `MAIL_USERNAME` | empty | SMTP account and From address. |
| `MAIL_APP_PASSWORD` | empty | SMTP app password. |

For a public recruiter demo, keep `DEMO_MODE=true` and `MAIL_ENABLED=false`. The delivery guard runs before creating or sending any SMTP message, for every recipient. It does not depend on the seeded account domain. Real delivery requires MAIL_ENABLED=true and DEMO_MODE=false. No credentials are hardcoded or changed by this refactor.

## Changed files

- `linoryx-api/src/main/java/com/linoryx/api/LinoryxApiApplication.java`: enables asynchronous methods.
- `linoryx-api/src/main/java/com/linoryx/api/report/domain/ReportResolvedEvent.java`: small immutable event.
- `linoryx-api/src/main/java/com/linoryx/api/report/service/CustomerReportService.java`: publishes only on a successful resolution transition.
- `linoryx-api/src/main/java/com/linoryx/api/notification/NotificationService.java`: after-commit listener and bounded retry.
- `linoryx-api/src/main/java/com/linoryx/api/notification/EmailService.java`: HTML/plain-text SMTP delivery and demo guard.
- `linoryx-api/src/main/java/com/linoryx/api/incident/services/IncidentService.java` and `incident/repository/IncidentRepository.java`: remove incident notifications and the unused threshold query.
- `linoryx-api/src/main/resources/templates/report-resolved.html`: Linoryx email template.
- `linoryx-api/src/main/resources/application.yaml` and `linoryx-api/.env.example`: delivery switches, application URL, executor and timeouts.
- `linoryx-web/src/App.tsx`: preserves report destination through sign-in.
- `linoryx-api/src/test/java/com/linoryx/api/notification/EmailServiceTest.java`, `NotificationServiceTest.java`, `ReportResolvedNotificationIntegrationTest.java`: content, demo guard, retries, transaction timing, ownership, concurrency and delivery failures. Remove the obsolete `CriticalIncidentNotificationTest.java`.
- `linoryx-api/src/test/java/com/linoryx/api/incident/services/IncidentServiceTest.java` and `IncidentWorkflowTest.java`: remove obsolete notification mocks.
- `linoryx-web/tests/reportEmailLinks.test.tsx`: authenticated report links and sign-in return behavior.
- `README.md`, `docs/demo-data.md` and this document: current behavior and setup.

## Verification

Tests use a mocked `EmailService` or `JavaMailSender`; no test sends real email. PostgreSQL integration tests use a separate disposable instance, without the application's database or volume.

Validated locally on 6 November 2026:

| Check | Result |
| --- | --- |
| Backend `mvnw.cmd clean verify` | 302 tests passed, zero failures/errors/skips; executable JAR built. |
| Frontend `npm.cmd test` | 106 tests passed across nine files. |
| Frontend `npm.cmd run lint` | Passed. |
| Frontend `npm.cmd run build` | TypeScript checks and production build passed. Existing large-chunk advisory remains. |
| `git diff --check` | Passed. |

New coverage includes the exact report owner, unrelated reports in the same incident, repeated and concurrent resolve requests, re-resolution after customer feedback, transaction rollback and commit timing, slow/failed delivery, retry exhaustion, unauthorized resolution, no email for CRITICAL incident creation or closure, disabled/demo delivery, HTML/plain-text content, and sign-in return links. The isolated PostgreSQL 18.6 test container was removed after verification. Running application containers and credentials were unchanged; rebuilding/restarting them to deploy these source changes is a separate step. Live SMTP delivery was not exercised.
