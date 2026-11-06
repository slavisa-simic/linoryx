import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Local Docker demo fixtures. No packages, application rebuild or mail delivery needed.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const apiBase = 'http://127.0.0.1:8081/api'
// Preserve existing demo identities, credentials and advisory lock for idempotent reseeding.
const domain = '@demo.vigil.test'
const password = 'VigilDemo2026!'
const marker = '[DEMO v1] Provera kompletnog toka prijave'
const tables = ['users', 'network_nodes', 'service_locations', 'customer_services',
  'technician_profiles', 'technician_specializations', 'incidents', 'customer_reports', 'comments', 'audit_logs']

function docker(args, input) {
  return execFileSync('docker', ['compose', ...args], {
    cwd: root, encoding: 'utf8', input, windowsHide: true, maxBuffer: 32 * 1024 * 1024
  }).trim()
}

function sql(query) {
  return docker(['exec', '-T', 'db', 'psql', '-X', '-q', '-A', '-t',
    '-v', 'ON_ERROR_STOP=1', '-U', 'vigil_api_user', '-d', 'vigil_db'], query)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function api(route, token, method = 'GET', body) {
  const response = await fetch(apiBase + route, {
    method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000)
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${method} ${route}: HTTP ${response.status}: ${text.slice(0, 500)}`)
  return text ? JSON.parse(text) : null
}

async function login(name) {
  return (await api('/auth/login', null, 'POST', { email: name + domain, password })).token
}

function counts() {
  return JSON.parse(sql(`SELECT json_build_object(${tables.map(table =>
    `'${table}', (SELECT count(*) FROM ${table})`).join(',')});`))
}

// Only store fingerprints of original rows, never their values or password hashes.
function originalRows() {
  return JSON.parse(sql(`SELECT coalesce(json_agg(t ORDER BY entity, id), '[]'::json) FROM (
    ${tables.filter(t => t !== 'technician_specializations').map(table =>
      `SELECT '${table}' AS entity, id, md5(to_jsonb(r)::text) AS fingerprint FROM ${table} r`).join('\nUNION ALL\n')}
    ) t;`))
}

function backup() {
  const folder = path.join(process.env.LOCALAPPDATA || homedir(), 'Linoryx', 'backups')
  mkdirSync(folder, { recursive: true })
  const name = 'before-demo-' + new Date().toISOString().replace(/[:.]/g, '-') + '.dump'
  const inside = '/tmp/' + name
  docker(['exec', '-T', 'db', 'pg_dump', '-U', 'vigil_api_user', '-d', 'vigil_db', '-Fc', '-f', inside])
  const container = docker(['ps', '-q', 'db'])
  const destination = path.join(folder, name)
  execFileSync('docker', ['cp', container + ':' + inside, destination], { cwd: root, windowsHide: true })
  docker(['exec', '-T', 'db', 'rm', inside])
  console.log('Database backup: ' + destination)
}

let randomState = 20261105
function random(max) {
  randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0
  return Math.floor((randomState / 4294967296) * max)
}
const pick = values => values[random(values.length)]
const pad = (n, size = 2) => String(n).padStart(size, '0')
const firstNames = ['Marko', 'Ana', 'Nikola', 'Jelena', 'Emir', 'Lejla', 'Stefan', 'Milica',
  'Amar', 'Sara', 'Ivan', 'Nina', 'Adnan', 'Maja', 'Luka', 'Emina', 'Petar', 'Ivana', 'Haris', 'Tea']
const lastNames = ['Petrovic', 'Hadzic', 'Markovic', 'Kovacevic', 'Jovanovic', 'Basic',
  'Nikolic', 'Savic', 'Djuric', 'Begovic', 'Ilic', 'Vukovic', 'Popovic', 'Tomic', 'Delic']
const cities = [
  ['Sarajevo', 'BA', 43.8563, 18.4131], ['Banja Luka', 'BA', 44.7722, 17.1910],
  ['Tuzla', 'BA', 44.5384, 18.6671], ['Mostar', 'BA', 43.3438, 17.8078],
  ['Zenica', 'BA', 44.2034, 17.9077], ['Beograd', 'RS', 44.7866, 20.4489],
  ['Novi Sad', 'RS', 45.2671, 19.8335], ['Nis', 'RS', 43.3209, 21.8958]
]
const streets = ['Demo ulica lipa', 'Demo park', 'Demo bulevar', 'Demo trg', 'Demo naselje']

function fixtures() {
  const accounts = []
  const addAccount = (key, role, n, enabled = true) => {
    const row = { n: accounts.length + 1, email: key + domain, role, enabled,
      first_name: firstNames[(n * 3 + accounts.length) % firstNames.length],
      last_name: lastNames[(n * 7 + accounts.length) % lastNames.length] }
    accounts.push(row)
    return row
  }
  const admins = [addAccount('admin', 'ADMIN', 1), addAccount('admin02', 'ADMIN', 2)]
  const dispatchers = Array.from({ length: 4 }, (_, i) => addAccount(
    i === 0 ? 'dispatcher' : 'dispatcher' + pad(i + 1), 'DISPATCHER', i + 1))
  const technicians = Array.from({ length: 24 }, (_, i) => ({
    ...addAccount(i === 0 ? 'technician' : 'technician' + pad(i + 1), 'TECHNICIAN', i + 1, i < 22),
    city: Math.floor(i / 3), skills: i % 3 === 0 ? ['FIBER', 'GPON', 'ROUTING'] :
      i % 3 === 1 ? ['DSL', 'ROUTING'] : ['WIRELESS', 'ROUTING']
  }))
  const customers = Array.from({ length: 200 }, (_, i) => ({
    ...addAccount(i === 0 ? 'customer' : 'customer' + pad(i + 1, 3), 'USER', i + 1, i < 190),
    city: Math.floor(i / 25)
  }))
  const nodes = cities.flatMap((city, c) => Array.from({ length: 10 }, (_, i) => {
    const type = ['GPON_OLT', 'GPON_OLT', 'GPON_OLT', 'GPON_OLT', 'ROUTER', 'ROUTER',
      'SWITCH', 'SWITCH', 'WIRELESS_BASE_STATION', 'WIRELESS_BASE_STATION'][i]
    const abbr = { GPON_OLT: 'OLT', ROUTER: 'RTR', SWITCH: 'SW', WIRELESS_BASE_STATION: 'WBS' }[type]
    return { n: c * 10 + i + 1, city_n: c, city: city[0], country_code: city[1],
      code: `DEMO-${city[0].replaceAll(' ', '').toUpperCase()}-${abbr}-${pad(i + 1, 3)}`,
      name: `Demo ${city[0]} - ${abbr} ${i + 1}`, location: `Demo telekom lokacija ${i + 1}, ${city[0]}`,
      latitude: city[2] + (random(1000) - 500) / 20000,
      longitude: city[3] + (random(1000) - 500) / 20000, node_type: type,
      status: i === 7 ? 'INACTIVE' : i === 9 ? 'MAINTENANCE' : 'ACTIVE' }
  }))
  const services = Array.from({ length: 500 }, (_, i) => {
    const customer = customers[i % 200]
    const city = cities[customer.city]
    const serviceType = i % 10 < 6 ? 'FIBER' : i % 10 < 8 ? 'DSL' : 'WIRELESS'
    const matching = nodes.filter(n => n.city_n === customer.city && n.node_type ===
      { FIBER: 'GPON_OLT', DSL: 'ROUTER', WIRELESS: 'WIRELESS_BASE_STATION' }[serviceType])
    return { n: i + 1, customer_n: customer.n, city_n: customer.city, city: city[0], country_code: city[1],
      formatted_address: `${streets[i % streets.length]} ${1 + i % 99}, ${city[0]}`,
      latitude: city[2] + (random(2000) - 1000) / 20000,
      longitude: city[3] + (random(2000) - 1000) / 20000,
      node_n: pick(matching).n, service_type: serviceType,
      status: i < 400 || i % 10 < 5 ? 'ACTIVE' :
        ['PENDING_ACTIVATION', 'SUSPENDED', 'TERMINATED'][(i % 10 - 5) % 3] }
  })
  const profiles = technicians.map((t, i) => ({
    n: i + 1, user_n: t.n, latitude: i >= 21 ? null : cities[t.city][2] + (random(1000) - 500) / 30000,
    longitude: i >= 21 ? null : cities[t.city][3] + (random(1000) - 500) / 30000,
    availability: i < 14 ? 'AVAILABLE' : i < 20 ? 'BUSY' : 'OFF_DUTY'
  }))
  const skills = technicians.flatMap((t, i) => t.skills.map(specialization => ({ profile_n: i + 1, specialization })))
  const incidents = []
  const reports = []
  const comments = []
  const audit = []
  const event = (action, actor_n, age, incident_n = null, report_n = null, target_n = null, previous_role = null, new_role = null) => {
    audit.push({ action, actor_n, age, incident_n, report_n, target_n, previous_role, new_role })
  }
  const reportCategories = ['NO_INTERNET', 'SLOW_CONNECTION', 'UNSTABLE_CONNECTION', 'HIGH_LATENCY', 'EQUIPMENT_ISSUE', 'OTHER']
  const descriptions = [
    'Internet veza nije dostupna. ONT prikazuje LOS signal i restart nije pomogao.',
    'Brzina veze je znatno ispod ugovorenog paketa, posebno u vecernjim satima.',
    'Veza se prekida vise puta tokom dana i onemogucava rad od kuce.',
    'Visok ping i gubitak paketa tokom video poziva i pristupa poslovnim servisima.',
    'Korisnicki ruter se samostalno restartuje i gubi konfiguraciju.',
    'Potrebna je provera konfiguracije usluge i pristupne opreme.'
  ]
  const scenarios = [
    { title: 'Dijagnostika prekida veze', category: 'UNDETERMINED' },
    { title: 'Prekid optickog linka', category: 'FIBER_FAILURE' },
    { title: 'Kvar GPON pristupnog segmenta', category: 'GPON_FAILURE' },
    { title: 'Problem rutiranja', category: 'ROUTING_FAILURE' },
    { title: 'Kvar agregacionog uredjaja', category: 'EQUIPMENT_FAILURE' },
    { title: 'Preopterecenje bazne stanice', category: 'WIRELESS_FAILURE' },
    { title: 'Kvar napajanja', category: 'POWER_OUTAGE' },
    { title: 'Prekid kod nadredjenog provajdera', category: 'UPSTREAM_FAILURE' },
    { title: 'Problem sa autentifikacijom', category: 'OTHER' }
  ]
  const commentText = ['Prijave su proverene i grupisane prema lokaciji i simptomima.',
    'Terenska ekipa je obavestena. Proveravaju se signal, napajanje i pristupni portovi.',
    'Izvrsena je dijagnostika linka i uporedjena merenja sa monitoring sistemom.',
    'Rezultati provere su evidentirani. Nastavlja se pracenje kvaliteta korisnicke veze.']
  for (let i = 1; i <= 180; i++) {
    const phase = (i - 1) % 10
    const status = phase < 2 ? 'OPEN' : phase < 6 ? 'IN_PROGRESS' : 'CLOSED'
    const age = status === 'OPEN' ? 180 + random(10 * 1440) : status === 'IN_PROGRESS'
      ? 1440 + random(20 * 1440) : 3 * 1440 + random(87 * 1440)
    const city_n = (i - 1) % cities.length
    const operator = dispatchers[(i - 1) % 4]
    const scenario = pick(scenarios)
    const incident = { n: i, title: i === 1 ? marker : `[DEMO v1] ${scenario.title} - ${cities[city_n][0]} #${pad(i, 3)}`,
      description: `Demo scenario ${i}: vise korisnickih prijava zahteva koordinisanu proveru pristupne mreze u gradu ${cities[city_n][0]}.`,
      severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'][random(4)],
      category: i === 1 ? 'UNDETERMINED' : scenario.category,
      status, created_by_n: operator.n, age, updated_age: status === 'OPEN' ? age : age - 5,
      closed_age: status === 'CLOSED' ? age - 900 : null }
    if (status === 'CLOSED') incident.updated_age = incident.closed_age
    incidents.push(incident)
    event('CREATED', operator.n, age, i)
    if (status !== 'OPEN') event('STARTED', operator.n, age - 5, i)
    const pool = services.filter(s => s.city_n === city_n && s.status === 'ACTIVE' && accounts[s.customer_n - 1].enabled)
    const reportCount = i === 1 ? 1 : i === 2 ? 11 : 6
    for (let j = 0; j < reportCount; j++) {
      const service = i === 1 ? services[0] : pool[(Math.floor(i / 8) * 7 + j * 3) % pool.length]
      const matching = technicians.filter(t => t.enabled && t.n <= technicians[19].n &&
        t.skills.includes(service.service_type))
      const local = matching.filter(t => t.city === city_n)
      const tech = pick(local.length ? local : matching)
      const reportStatus = status === 'OPEN' ? 'OPEN' : status === 'CLOSED' ? 'CLOSED' :
        ['OPEN', 'IN_PROGRESS', 'IN_PROGRESS', 'RESOLVED', 'RESOLVED', 'CLOSED'][j]
      const assigned = i !== 1 && !(reportStatus === 'OPEN' && j % 2 === 0)
      const reopened = reportStatus === 'IN_PROGRESS' && j === 2 && i % 2 === 0
      const category = random(6)
      const row = { n: reports.length + 1, service_n: service.n, incident_n: i,
        assigned_n: assigned ? tech.n : null, category: reportCategories[category],
        description: `${descriptions[category]} Demo prijava ${reports.length + 1}; ${service.formatted_address}.`,
        status: reportStatus, user_confirmed: reportStatus === 'CLOSED' || (reportStatus === 'RESOLVED' && j === 4),
        customer_reported_unfixed: reopened, age: age + 20 + random(100),
        updated_age: age - 1, resolved_age: null, closed_age: null }
      if (assigned) row.updated_age = age - 2
      if (reportStatus === 'IN_PROGRESS') row.updated_age = age - (reopened ? 500 : 30)
      if (reportStatus === 'RESOLVED' || reportStatus === 'CLOSED') {
        row.resolved_age = age - 360
        row.updated_age = row.user_confirmed ? age - 480 : row.resolved_age
      }
      if (reportStatus === 'CLOSED') { row.closed_age = age - 600; row.updated_age = row.closed_age }
      reports.push(row)
      event('REPORT_CREATED', service.customer_n, row.age, null, row.n)
      event('REPORT_LINKED', operator.n, age - 1, i, row.n)
      if (assigned) event('REPORT_ASSIGNED', operator.n, age - 2, i, row.n)
      if (reportStatus !== 'OPEN') event('REPORT_STARTED', tech.n, age - 30, i, row.n)
      if (row.resolved_age !== null || reopened) event('REPORT_RESOLVED', tech.n, age - 360, i, row.n)
      if (reopened) event('CUSTOMER_STILL_NOT_WORKING', service.customer_n, age - 500, i, row.n)
      if (row.user_confirmed) event('CUSTOMER_CONFIRMED', service.customer_n, age - 480, i, row.n)
      if (row.closed_age !== null) event('REPORT_CLOSED', operator.n, row.closed_age, i, row.n)
    }
    if (status === 'CLOSED') event('CLOSED', operator.n, incident.closed_age, i)
    const assignedReport = reports.find(r => r.incident_n === i && r.assigned_n !== null)
    for (let j = 0; j < 4; j++) {
      const author = j % 2 === 1 && assignedReport ? assignedReport.assigned_n : operator.n
      const commentAge = age - Math.min((j + 1) * 40, Math.floor((age - 10) * (j + 1) / 5))
      comments.push({ incident_n: i, user_n: author, content: commentText[j], age: commentAge })
      event('COMMENT_ADDED', author, commentAge, i)
    }
  }
  const activeServices = services.filter(s => s.status === 'ACTIVE' && accounts[s.customer_n - 1].enabled)
  for (let i = 0; i < 120; i++) {
    const service = activeServices[(i * 13) % activeServices.length]
    const category = i % 6
    const age = 5 + random(5 * 1440)
    const row = { n: reports.length + 1, service_n: service.n, incident_n: null, assigned_n: null,
      category: reportCategories[category], description: `${descriptions[category]} Nova demo prijava ceka trijazu (${i + 1}).`,
      status: 'OPEN', user_confirmed: false, customer_reported_unfixed: false,
      age, updated_age: age, resolved_age: null, closed_age: null }
    reports.push(row)
    event('REPORT_CREATED', service.customer_n, age, null, row.n)
  }
  for (const user of accounts) {
    if (user.role !== 'USER') event('USER_ROLE_CHANGED', admins[0].n, 120 * 1440 - 60,
      null, null, user.n, 'USER', user.role)
    if (!user.enabled) event('USER_DISABLED', admins[0].n, 2 * 1440, null, null, user.n)
  }
  return { accounts, nodes, services, profiles, skills, incidents, reports, comments, audit }
}

// Stage generated rows through PostgreSQL COPY; foreign keys use database-allocated IDs.
function stage(name, definitions, rows, sequenceTable) {
  const columns = Object.keys(definitions)
  const csv = rows.map(row => columns.map(column => {
    const value = row[column]
    return value === null || value === undefined ? '' : '"' + String(value).replaceAll('"', '""') + '"'
  }).join(',')).join('\n')
  return `CREATE TEMP TABLE demo_${name} (${columns.map(c => `${c} ${definitions[c]}`).join(', ')},
    id bigint ${sequenceTable ? `DEFAULT nextval(pg_get_serial_sequence('${sequenceTable}', 'id'))` : ''}) ON COMMIT DROP;
COPY demo_${name} (${columns.join(', ')}) FROM STDIN WITH (FORMAT csv);
${csv}
\\.
`
}

function seedSql(data) {
  let result = `BEGIN;
SET LOCAL TIME ZONE 'Europe/Sarajevo';
SELECT pg_advisory_xact_lock(hashtext('vigil-demo-v1'));
-- Check again under the lock; concurrent seed invocations must not duplicate fixtures.
SELECT EXISTS (SELECT 1 FROM incidents WHERE title = '${marker}') AS already_seeded \\gset
\\if :already_seeded
ROLLBACK;
\\quit
\\endif
CREATE TEMP TABLE demo_context ON COMMIT DROP AS SELECT localtimestamp AS now;
CREATE TEMP TABLE demo_password ON COMMIT DROP AS
  SELECT password_hash FROM users WHERE email = 'admin${domain}';
DO $$ BEGIN
  IF (SELECT count(*) FROM demo_password) <> 1 THEN RAISE EXCEPTION 'Demo bootstrap account missing'; END IF;
  IF EXISTS (SELECT 1 FROM users WHERE email LIKE '%${domain}' AND email <> 'admin${domain}')
  THEN RAISE EXCEPTION 'Reserved demo emails already exist; refusing to overwrite accounts'; END IF;
END $$;
`
  result += stage('users', { n: 'integer', email: 'text', role: 'text', enabled: 'boolean', first_name: 'text', last_name: 'text' }, data.accounts)
  result += `UPDATE demo_users d SET id = CASE WHEN d.email = 'admin${domain}' THEN
    (SELECT id FROM users WHERE email = d.email) ELSE nextval(pg_get_serial_sequence('users','id')) END;
INSERT INTO users (id,email,role,enabled,first_name,last_name,password_hash,created_at)
SELECT d.id,d.email,d.role,d.enabled,d.first_name,d.last_name,p.password_hash,c.now - interval '120 days'
FROM demo_users d CROSS JOIN demo_password p CROSS JOIN demo_context c WHERE d.email <> 'admin${domain}';
-- The bootstrap account was created by this script through the registration API.
UPDATE users SET role='ADMIN', created_at=(SELECT now-interval '120 days' FROM demo_context)
WHERE email='admin${domain}';
`
  result += stage('nodes', { n: 'integer', city: 'text', country_code: 'text', code: 'text', name: 'text', location: 'text',
    latitude: 'numeric', longitude: 'numeric', node_type: 'text', status: 'text' }, data.nodes, 'network_nodes')
  result += `INSERT INTO network_nodes (id,city,country_code,code,name,location,latitude,longitude,node_type,status,created_at)
SELECT d.id,d.city,d.country_code,d.code,d.name,d.location,d.latitude,d.longitude,d.node_type,d.status,c.now-interval '110 days'
FROM demo_nodes d CROSS JOIN demo_context c;
`
  result += stage('services', { n: 'integer', customer_n: 'integer', node_n: 'integer', city: 'text', country_code: 'text',
    formatted_address: 'text', latitude: 'numeric', longitude: 'numeric', service_type: 'text', status: 'text' }, data.services, 'customer_services')
  result += `ALTER TABLE demo_services ADD COLUMN location_id bigint DEFAULT nextval(pg_get_serial_sequence('service_locations','id'));
INSERT INTO service_locations (id,city,country_code,formatted_address,latitude,longitude)
SELECT location_id,city,country_code,formatted_address,latitude,longitude FROM demo_services;
INSERT INTO customer_services (id,customer_id,network_node_id,service_location_id,service_type,status,created_at)
SELECT d.id,u.id,n.id,d.location_id,d.service_type,d.status,c.now-interval '100 days'
FROM demo_services d JOIN demo_users u ON u.n=d.customer_n JOIN demo_nodes n ON n.n=d.node_n CROSS JOIN demo_context c;
`
  result += stage('profiles', { n: 'integer', user_n: 'integer', latitude: 'numeric', longitude: 'numeric', availability: 'text' }, data.profiles, 'technician_profiles')
  result += stage('skills', { profile_n: 'integer', specialization: 'text' }, data.skills)
  result += `INSERT INTO technician_profiles (id,user_id,latitude,longitude,availability,location_updated_at)
SELECT d.id,u.id,d.latitude,d.longitude,d.availability,CASE WHEN d.latitude IS NOT NULL THEN c.now-interval '15 minutes' END
FROM demo_profiles d JOIN demo_users u ON u.n=d.user_n CROSS JOIN demo_context c;
INSERT INTO technician_specializations (profile_id,specialization)
SELECT p.id,s.specialization FROM demo_skills s JOIN demo_profiles p ON p.n=s.profile_n;
`
  result += stage('incidents', { n: 'integer', title: 'text', description: 'text', severity: 'text', category: 'text', status: 'text',
    created_by_n: 'integer', age: 'integer', updated_age: 'integer', closed_age: 'integer' }, data.incidents, 'incidents')
  result += `INSERT INTO incidents (id,title,description,severity,category,status,created_by_id,created_at,updated_at,closed_at,legacy)
SELECT d.id,d.title,d.description,d.severity,d.category,d.status,u.id,c.now-d.age*interval '1 minute',
c.now-d.updated_age*interval '1 minute',c.now-d.closed_age*interval '1 minute',false
FROM demo_incidents d JOIN demo_users u ON u.n=d.created_by_n CROSS JOIN demo_context c;
`
  result += stage('reports', { n: 'integer', service_n: 'integer', incident_n: 'integer', assigned_n: 'integer', category: 'text',
    description: 'text', status: 'text', user_confirmed: 'boolean', customer_reported_unfixed: 'boolean',
    age: 'integer', updated_age: 'integer', resolved_age: 'integer', closed_age: 'integer' }, data.reports, 'customer_reports')
  result += `INSERT INTO customer_reports (id,customer_service_id,incident_id,assigned_technician_id,category,description,status,
user_confirmed,customer_reported_unfixed,created_at,updated_at,resolved_at,closed_at)
SELECT d.id,s.id,i.id,u.id,d.category,d.description,d.status,d.user_confirmed,d.customer_reported_unfixed,
c.now-d.age*interval '1 minute',c.now-d.updated_age*interval '1 minute',
c.now-d.resolved_age*interval '1 minute',c.now-d.closed_age*interval '1 minute'
FROM demo_reports d JOIN demo_services s ON s.n=d.service_n LEFT JOIN demo_incidents i ON i.n=d.incident_n
LEFT JOIN demo_users u ON u.n=d.assigned_n CROSS JOIN demo_context c;
`
  result += stage('comments', { incident_n: 'integer', user_n: 'integer', content: 'text', age: 'integer' }, data.comments)
  result += `INSERT INTO comments (incident_id,user_id,content,created_at)
SELECT i.id,u.id,d.content,c.now-d.age*interval '1 minute'
FROM demo_comments d JOIN demo_incidents i ON i.n=d.incident_n JOIN demo_users u ON u.n=d.user_n CROSS JOIN demo_context c;
`
  result += stage('audit', { action: 'text', actor_n: 'integer', age: 'integer', incident_n: 'integer', report_n: 'integer',
    target_n: 'integer', previous_role: 'text', new_role: 'text' }, data.audit)
  result += `INSERT INTO audit_logs (action,actor_id,created_at,incident_id,report_id,target_user_id,previous_role,new_role)
SELECT d.action,u.id,c.now-d.age*interval '1 minute',i.id,r.id,t.id,d.previous_role,d.new_role
FROM demo_audit d JOIN demo_users u ON u.n=d.actor_n LEFT JOIN demo_incidents i ON i.n=d.incident_n
LEFT JOIN demo_reports r ON r.n=d.report_n LEFT JOIN demo_users t ON t.n=d.target_n CROSS JOIN demo_context c;
DO $$ BEGIN
  IF (SELECT count(*) FROM demo_users) <> 230 OR (SELECT count(*) FROM demo_nodes) <> 80
    OR (SELECT count(*) FROM demo_services) <> 500 OR (SELECT count(*) FROM demo_incidents) <> 180
    OR (SELECT count(*) FROM demo_reports) <> 1200 OR (SELECT count(*) FROM demo_comments) <> 720
  THEN RAISE EXCEPTION 'Fixture size mismatch'; END IF;
  IF EXISTS (SELECT 1 FROM customer_reports r JOIN demo_reports d ON d.id=r.id
    LEFT JOIN incidents i ON i.id=r.incident_id LEFT JOIN users u ON u.id=r.assigned_technician_id
    WHERE (r.status <> 'OPEN' AND (i.id IS NULL OR r.assigned_technician_id IS NULL))
      OR (r.status IN ('IN_PROGRESS','RESOLVED') AND i.status <> 'IN_PROGRESS')
      OR (i.status='CLOSED' AND r.status <> 'CLOSED')
      OR (u.id IS NOT NULL AND (u.role <> 'TECHNICIAN' OR NOT u.enabled))
      OR (r.status='CLOSED' AND (NOT r.user_confirmed OR r.closed_at IS NULL))
      OR ((r.status IN ('RESOLVED','CLOSED')) <> (r.resolved_at IS NOT NULL))
      OR r.updated_at < r.created_at OR r.updated_at > localtimestamp
      OR r.resolved_at < r.created_at OR r.closed_at < r.resolved_at)
  THEN RAISE EXCEPTION 'Invalid report workflow or chronology'; END IF;
END $$;
COMMIT;
`
  return result
}

async function check() {
  const tokens = {}
  for (const [name, role] of [['admin', 'ADMIN'], ['dispatcher', 'DISPATCHER'], ['technician', 'TECHNICIAN'], ['customer', 'USER']]) {
    tokens[name] = await login(name)
    const me = await api('/users/me', tokens[name])
    assert(me.role === role, 'Unexpected role for demo ' + name)
  }
  const expected = { users: 230, 'network-nodes': 80, 'customer-services': 500, incidents: 180, reports: 1200, audit: 1 }
  for (const [endpoint, minimum] of Object.entries(expected)) {
    let total = 0
    let pages = 1
    for (let page = 0; page < pages; page++) {
      const response = await api(`/${endpoint}?size=200&sort=id,asc&page=${page}`, tokens.admin)
      pages = response.totalPages
      total += response.content.length
      assert(response.totalElements >= minimum, endpoint + ' missing fixtures')
      assert(response.content.length > 0, endpoint + ' returned an empty page')
      if (page === pages - 1) assert(total === response.totalElements, endpoint + ' pagination mismatch')
    }
    console.log(`API /${endpoint}: ${total} records across ${pages} pages OK`)
  }
  const techs = await api('/technicians/overview', tokens.admin)
  assert(techs.length >= 22, 'Technician overview is incomplete')
  assert(techs.some(t => t.activeReportCount > 0), 'Technician workloads are empty')
  assert((await api('/reports/assigned?size=200', tokens.technician)).totalElements > 0, 'Demo technician has no reports')
  assert((await api('/technicians/me/assignment-locations', tokens.technician)).length > 0, 'Assignment map is empty')
  assert((await api('/reports/my?size=200', tokens.customer)).totalElements > 0, 'Demo customer has no reports')
  const myServices = await api('/customer-services?size=200', tokens.customer)
  assert(myServices.totalElements > 0, 'Demo customer has no services')
  const customerId = (await api('/users/me', tokens.customer)).id
  assert(myServices.content.every(s => s.customerId === customerId), 'Customer service scope mismatch')
  const open = await api('/reports?status=OPEN&size=200', tokens.dispatcher)
  assert(open.content.some(r => !r.incidentId), 'No reports available for dispatcher triage')
  const unlinked = open.content.find(r => !r.incidentId)
  const recommendations = await api(`/reports/${unlinked.id}/technician-recommendations`, tokens.dispatcher)
  assert(recommendations.some(r => r.recommended), 'No usable technician recommendations')
  const id = Number(sql(`SELECT id FROM incidents WHERE title='${marker}';`))
  assert((await api(`/incidents/${id}/comments?size=200`, tokens.admin)).totalElements >= 4, 'Missing incident comments')
  assert((await api(`/incidents/${id}/audit?size=200`, tokens.admin)).totalElements > 0, 'Missing incident audit trail')
  console.log('All four roles, customer scope, comments, technician maps and recommendations OK')
  return tokens
}

async function exerciseWorkflow(tokens) {
  const fixture = JSON.parse(sql(`SELECT json_build_object('incident',i.id,'report',r.id,'technician',u.id)
    FROM incidents i JOIN customer_reports r ON r.incident_id=i.id
    CROSS JOIN users u WHERE i.title='${marker}' AND u.email='technician${domain}';`))
  await api(`/reports/${fixture.report}/assign`, tokens.dispatcher, 'PATCH', { technicianId: fixture.technician })
  await api(`/incidents/${fixture.incident}/start`, tokens.dispatcher, 'PATCH')
  const diagnosed = await api(`/incidents/${fixture.incident}/category`, tokens.dispatcher, 'PATCH', { category: 'FIBER_FAILURE' })
  assert(diagnosed.category === 'FIBER_FAILURE', 'Incident cause was not updated after diagnosis')
  await api(`/reports/${fixture.report}/start`, tokens.technician, 'PATCH')
  await api(`/reports/${fixture.report}/resolve`, tokens.technician, 'PATCH')
  await api(`/reports/${fixture.report}/confirm-fixed`, tokens.customer, 'PATCH')
  const report = await api(`/reports/${fixture.report}/close`, tokens.dispatcher, 'PATCH')
  const incident = await api(`/incidents/${fixture.incident}/close`, tokens.dispatcher, 'PATCH')
  assert(report.status === 'CLOSED' && incident.status === 'CLOSED', 'Workflow did not reach CLOSED')
  console.log(`Full API workflow OK: REP-${fixture.report} and INC-${fixture.incident} closed with customer confirmation`)
}

async function main() {
  const args = process.argv.slice(2)
  assert(args.length === 0 || (args.length === 1 && args[0] === '--check'), 'Usage: node scripts/seed-demo.mjs [--check]')
  const exists = sql(`SELECT EXISTS (SELECT 1 FROM incidents WHERE title='${marker}');`) === 't'
  if (args[0] === '--check') {
    assert(exists, 'Demo dataset is not seeded yet')
    await check()
    return
  }
  if (exists) {
    console.log('Demo dataset already exists; preserving changes and checking it without inserting duplicates.')
    await check()
    return
  }
  const bootstrapId = Number(sql(`SELECT coalesce((SELECT id FROM users WHERE email='admin${domain}'),0);`))
  const before = originalRows().filter(row => row.entity !== 'users' || row.id !== bootstrapId)
  const beforeCounts = counts()
  backup()
  const bootstrap = bootstrapId !== 0
  if (!bootstrap) {
    await api('/auth/register', null, 'POST', { email: 'admin' + domain, password, firstName: 'Demo', lastName: 'Administrator' })
  } else {
    // Allow retry after a rolled-back seed, but never adopt an account with a different password.
    await login('admin')
  }
  const data = fixtures()
  console.log('Seeding 230 accounts, 80 nodes, 500 services, 180 incidents and 1,200 reports...')
  sql(seedSql(data))
  const after = new Map(originalRows().map(row => [row.entity + ':' + row.id, row.fingerprint]))
  for (const row of before) {
    assert(after.get(row.entity + ':' + row.id) === row.fingerprint, 'Original row changed: ' + row.entity + ':' + row.id)
  }
  const afterCounts = counts()
  const expected = { users: bootstrap ? 229 : 230, network_nodes: 80, service_locations: 500,
    customer_services: 500, technician_profiles: 24, technician_specializations: data.skills.length,
    incidents: 180, customer_reports: 1200, comments: 720, audit_logs: data.audit.length }
  for (const [table, amount] of Object.entries(expected)) {
    assert(afterCounts[table] - beforeCounts[table] === amount, 'Unexpected insert count for ' + table)
  }
  console.log('Database counts, report invariants and original row fingerprints OK')
  const tokens = await check()
  await exerciseWorkflow(tokens)
  console.log('Done. All demo accounts use password: ' + password)
  console.log('Sign in at http://localhost:8081. Demo logins: ' + ['admin', 'dispatcher', 'technician', 'customer'].map(name => name + domain).join(', '))
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
