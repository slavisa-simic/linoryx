-- Audit sada prati i korisnike, pa incident nije obavezan.
ALTER TABLE audit_logs ALTER COLUMN incident_id DROP NOT NULL;

-- Postojeca baza treba da prihvati i nove audit akcije.
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'REPORT_CREATED', 'REPORT_LINKED', 'REPORT_ASSIGNED', 'REPORT_STARTED', 'REPORT_RESOLVED',
    'CUSTOMER_CONFIRMED', 'CUSTOMER_STILL_NOT_WORKING', 'REPORT_CLOSED',
    'CREATED', 'ASSIGNED', 'STARTED', 'RESOLVED', 'CLOSED', 'COMMENT_ADDED',
    'USER_ROLE_CHANGED', 'USER_DISABLED', 'USER_ENABLED'
));

-- Postojeca baza treba da prihvati DISPATCHER ulogu i promjene te uloge.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
    'USER', 'TECHNICIAN', 'DISPATCHER', 'ADMIN'
));
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_previous_role_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_previous_role_check CHECK (previous_role IN (
    'USER', 'TECHNICIAN', 'DISPATCHER', 'ADMIN'
));
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_new_role_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_new_role_check CHECK (new_role IN (
    'USER', 'TECHNICIAN', 'DISPATCHER', 'ADMIN'
));

-- A counter is kept after a node is deleted. This is not a city catalog.
CREATE TABLE IF NOT EXISTS node_code_counters (
    prefix VARCHAR(180) PRIMARY KEY,
    last_number BIGINT NOT NULL CHECK (last_number > 0)
);

-- Preserve historical incidents and their original status, creator, assignment and resolution date.
-- Hibernate adds the legacy column with DEFAULT true; new Incident constructors write false.
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
UPDATE incidents SET legacy_status = status WHERE legacy = true AND legacy_status IS NULL;
UPDATE incidents SET status = 'IN_PROGRESS' WHERE status = 'RESOLVED';
ALTER TABLE incidents ADD CONSTRAINT incidents_status_check CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED'));
