-- Run with psql after Linoryx has created its tables. Pass -v customer_email=...
\set ON_ERROR_STOP on
BEGIN;

-- Pass the psql argument into the SQL block for this transaction.
SELECT set_config('linoryx.demo_customer_email', lower(trim(:'customer_email')), true) AS demo_email \gset

DO $$
DECLARE
    customer_email text := current_setting('linoryx.demo_customer_email');
    demo_password_hash text := '$2a$10$QVOnrvLfjE1j6K.smo35x.WPLQd6dTm3f3BojGwvFc3ygAOO48ZEm'; -- BCrypt of LinoryxDemo2026!
    demo_node_code text := 'DEMO-LINORYX-OLT-001';
    customer_id bigint;
    dispatcher_id bigint;
    technician_id bigint;
    profile_id bigint;
    node_id bigint;
    location_id bigint;
    service_id bigint;
    active_incident_id bigint;
    closed_incident_id bigint;
    created_at timestamptz := now();
BEGIN
    IF customer_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
        OR customer_email IN ('admin@demo.linoryx.test', 'dispatcher@demo.linoryx.test', 'technician@demo.linoryx.test') THEN
        RAISE EXCEPTION 'Choose a valid email address for the demo customer.';
    END IF;

    -- The demo node marks a completed seed. Repeating it leaves the workflow untouched.
    SELECT id INTO node_id FROM network_nodes WHERE code = demo_node_code;
    IF node_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM customer_services s JOIN users u ON u.id = s.customer_id
                   WHERE s.network_node_id = node_id AND u.email = customer_email) THEN
            RAISE NOTICE 'Demo data already exists for this customer.';
            RETURN;
        END IF;
        RAISE EXCEPTION 'Demo data already exists with a different customer.';
    END IF;
    IF EXISTS (SELECT 1 FROM users WHERE email = customer_email) THEN
        RAISE EXCEPTION 'This customer address already has an account. Use a fresh test address.';
    END IF;

    -- Accounts and technician profile. The database generates every ID.
    INSERT INTO users (email, password_hash, first_name, last_name, role, enabled, created_at)
    VALUES ('admin@demo.linoryx.test', demo_password_hash, 'Demo', 'Admin', 'ADMIN', true, created_at);
    INSERT INTO users (email, password_hash, first_name, last_name, role, enabled, created_at)
    VALUES ('dispatcher@demo.linoryx.test', demo_password_hash, 'Demo', 'Dispatcher', 'DISPATCHER', true, created_at)
    RETURNING id INTO dispatcher_id;
    INSERT INTO users (email, password_hash, first_name, last_name, role, enabled, created_at)
    VALUES ('technician@demo.linoryx.test', demo_password_hash, 'Demo', 'Technician', 'TECHNICIAN', true, created_at)
    RETURNING id INTO technician_id;
    INSERT INTO users (email, password_hash, first_name, last_name, role, enabled, created_at)
    VALUES (customer_email, demo_password_hash, 'Demo', 'Customer', 'USER', true, created_at)
    RETURNING id INTO customer_id;

    INSERT INTO technician_profiles (user_id, latitude, longitude, availability, location_updated_at)
    VALUES (technician_id, 45.2510, 19.8440, 'AVAILABLE', created_at)
    RETURNING id INTO profile_id;
    INSERT INTO technician_specializations (profile_id, specialization)
    VALUES (profile_id, 'FIBER');

    -- The customer has one active fiber service linked to a network node.
    INSERT INTO network_nodes (code, name, node_type, location, city, country_code, latitude, longitude, status, created_at)
    VALUES (demo_node_code, 'Demo Novi Sad OLT', 'GPON_OLT', 'Demo Network Station, Novi Sad',
            'Novi Sad', 'RS', 45.2540, 19.8420, 'ACTIVE', created_at)
    RETURNING id INTO node_id;
    INSERT INTO service_locations (formatted_address, city, country_code, latitude, longitude)
    VALUES ('Demo Street 12, Novi Sad', 'Novi Sad', 'RS', 45.2490, 19.8460)
    RETURNING id INTO location_id;
    INSERT INTO customer_services (customer_id, service_type, service_location_id, network_node_id, status, created_at)
    VALUES (customer_id, 'FIBER', location_id, node_id, 'ACTIVE', created_at)
    RETURNING id INTO service_id;

    -- One current incident and one closed example for the dashboard and exports.
    INSERT INTO incidents (title, description, severity, category, status, created_by_id, created_at, updated_at, legacy)
    VALUES ('[Demo] Fiber outage', 'Repair an interrupted fiber connection.', 'HIGH', 'FIBER_FAILURE',
            'IN_PROGRESS', dispatcher_id, created_at, created_at, false)
    RETURNING id INTO active_incident_id;
    INSERT INTO incidents (title, description, severity, category, status, created_by_id, created_at, updated_at, closed_at, legacy)
    VALUES ('[Demo] Past equipment issue', 'A faulty device was replaced.', 'MEDIUM', 'EQUIPMENT_FAILURE',
            'CLOSED', dispatcher_id, created_at - interval '3 days', created_at - interval '2 days',
            created_at - interval '2 days', false)
    RETURNING id INTO closed_incident_id;

    -- An open report for triage, an assigned report for the email demo, and a closed report.
    INSERT INTO customer_reports (customer_service_id, incident_id, assigned_technician_id, category,
                                  description, status, user_confirmed, customer_reported_unfixed,
                                  created_at, updated_at, resolved_at, closed_at)
    VALUES
        (service_id, NULL, NULL, 'SLOW_CONNECTION', '[Demo] Slow connection',
         'OPEN', false, false, created_at, created_at, NULL, NULL),
        (service_id, active_incident_id, technician_id, 'NO_INTERNET', '[Demo] No connection - email demo',
         'IN_PROGRESS', false, false, created_at, created_at, NULL, NULL),
        (service_id, closed_incident_id, technician_id, 'EQUIPMENT_ISSUE', '[Demo] Equipment was replaced',
         'CLOSED', true, false, created_at - interval '3 days', created_at - interval '2 days',
         created_at - interval '2 days 1 hour', created_at - interval '2 days');
END;
$$;

COMMIT;
