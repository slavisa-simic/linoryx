-- Audit sada prati i korisnike, pa incident nije obavezan.
ALTER TABLE audit_logs ALTER COLUMN incident_id DROP NOT NULL;

-- Postojeca baza treba da prihvati i nove audit akcije.
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
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
