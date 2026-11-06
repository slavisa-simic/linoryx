# Diagram notes

## Database schema

The diagram uses the running local PostgreSQL database's `information_schema` metadata, checked against the JPA mappings and startup SQL. The [metadata file](source/database-schema.json) includes all 11 tables, their columns, nullability, primary keys, unique constraints and 16 foreign keys. The [Graphviz source](source/database-schema.dot) is built from that file.

Each relationship is labeled `parent : child`. A nullable foreign key allows zero or one parent; a unique foreign key allows at most one child per parent. The two `UK1` fields in `technician_specializations` form one composite unique constraint. `node_code_counters` has no foreign key to `network_nodes`.

## Use cases

The [model](source/use-cases.json), [PlantUML source](source/use-cases.puml) and rendered image share the same four actors and 23 main use cases. The administrator inherits dispatcher actions. Customer and technician actions remain separate.

`«include»` arrows point from the main use case to a required step. `«extend»` arrows point from an optional action to the use case it extends.

| Connection | Implementation basis |
| --- | --- |
| Report problem includes checking service ownership and active status | `CustomerReportService.create` |
| Start/resolve work includes checking the assigned technician and started incident | `CustomerReportService.start` and `resolve` |
| Create incident includes selecting and linking eligible reports | `IncidentService.createIncident`, `lockEligibleReports` and `linkReports` |
| Assign technician includes checking the enabled account and AVAILABLE profile | `CustomerReportService.assign` |
| Close incident includes checking that all linked reports are closed | `IncidentService.closeIncident` |
| Provision service includes verifying the address and selecting a network node | `CustomerServiceService.create` |
| Confirm repair and Still Not Working extend reviewing a resolved report | `CustomerReport.confirmFixed` and `stillNotWorking` require RESOLVED |
| Resolution email extends report work after resolution, with delivery enabled and demo mode off | `CustomerReportService.resolve`, `NotificationService` and `EmailService` |

The email integration uses Gmail SMTP through Spring Mail. The main diagram covers the core workflows; the README's feature and role tables describe the wider project.
