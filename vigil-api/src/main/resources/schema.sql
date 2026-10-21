-- Audit sada prati i korisnike, pa incident nije obavezan.
ALTER TABLE audit_logs ALTER COLUMN incident_id DROP NOT NULL;

-- Postojeca baza treba da prihvati i nove audit akcije.
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'CREATED', 'ASSIGNED', 'STARTED', 'RESOLVED', 'CLOSED', 'COMMENT_ADDED',
    'USER_ROLE_CHANGED', 'USER_DISABLED', 'USER_ENABLED'
));
