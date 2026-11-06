import { createRequire } from 'node:module'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(resolve(process.argv[2] || root), 'package.json'))
const { instance } = require('@viz-js/viz')
const { Resvg } = require('@resvg/resvg-js')
const output = join(root, 'docs/readme/visuals')
const source = join(output, 'source')
const fonts = ['Inter-Regular.ttf', 'Inter-SemiBold.ttf'].map(name => join(root, 'linoryx-web/public/fonts', name))
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const snapshot = JSON.parse(await readFile(join(source, 'database-schema.json'), 'utf8'))
const typeName = type => ({ 'character varying': 'varchar', 'timestamp without time zone': 'timestamp' })[type] || type
const keysFor = (table, kind) => snapshot.keys.filter(key => key.table_name === table && key.constraint_type === kind).flatMap(key => key.columns)

function schemaDot(tables, detailed = true) {
let dot = `digraph schema {
graph [rankdir=LR, bgcolor="#F7F5F2", pad=.45, nodesep=.5, ranksep=1.3, splines=polyline, outputorder=edgesfirst, fontname="Inter", label="Database schema · 11 tables / 16 foreign keys\\nPK = primary key   FK = foreign key   UK = unique key   ? = nullable\\nUK1 marks the two columns of one composite unique key\\nRelationship labels read parent : child cardinality", labelloc=t, fontsize=19, fontcolor="#1A1A1A"];
node [shape=plain, fontname="Inter", fontsize=12];
edge [color="#80766E", penwidth=1.3, fontname="Inter", fontsize=11, fontcolor="#5D554F", labeldistance=2.2];
`
for (const table of tables) {
  const pk = keysFor(table.table_name, 'PRIMARY KEY')
  const uk = keysFor(table.table_name, 'UNIQUE')
  const composite = snapshot.keys.filter(key => key.table_name === table.table_name && key.constraint_type === 'UNIQUE' && key.columns.length > 1)
  const fk = snapshot.foreignKeys.filter(key => key.table_name === table.table_name).map(key => key.column_name)
  const nameWidth = Math.max(145, Math.ceil(Math.max(...table.columns.map(column => column.name.length + 2)) * 8.8 + 32))
  const rows = table.columns.map(column => {
    const group = composite.findIndex(key => key.columns.includes(column.name))
    const flags = [pk.includes(column.name) ? 'PK' : '', fk.includes(column.name) ? 'FK' : '', uk.includes(column.name) ? 'UK' + (group >= 0 ? group + 1 : '') : ''].filter(Boolean).join(' ')
    return `<TR><TD PORT="${column.name}" WIDTH="67" ALIGN="LEFT" BGCOLOR="${flags ? '#F1E5E0' : '#FFFFFF'}"><FONT COLOR="#B74335">${flags || ' '}</FONT></TD><TD WIDTH="${nameWidth}" ALIGN="LEFT">${xml(column.name)}${column.nullable === 'YES' ? ' ?' : ''}</TD>${detailed ? `<TD WIDTH="105" ALIGN="LEFT"><FONT COLOR="#6B6B6B">${typeName(column.type)}</FONT></TD>` : ''}</TR>`
  }).join('')
  dot += `${table.table_name} [label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="7" COLOR="#D6D2CC" BGCOLOR="#FFFFFF"><TR><TD COLSPAN="${detailed ? 3 : 2}" BGCOLOR="#F1E5E0" ALIGN="LEFT"><B>${table.table_name}</B></TD></TR>${rows}</TABLE>>];\n`
}
for (const fk of snapshot.foreignKeys) {
  const table = snapshot.tables.find(table => table.table_name === fk.table_name)
  const nullable = table.columns.find(column => column.name === fk.column_name).nullable === 'YES'
  const unique = snapshot.keys.some(key => key.table_name === fk.table_name && key.columns.length === 1 && key.columns[0] === fk.column_name)
  dot += `${fk.references_table}:${fk.references_column}:e -> ${fk.table_name}:${fk.column_name}:w [dir=none, label="${nullable ? '0..1' : '1'} : ${unique ? '0..1' : '0..*'}"];\n`
}
dot += '}\n'
return detailed ? dot : dot.replace('node [shape=plain, fontname="Inter", fontsize=12]', 'node [shape=plain, fontname="Inter", fontsize=15]')
}
const dot = schemaDot(snapshot.tables)
await writeFile(join(source, 'database-schema.dot'), dot)
const viz = await instance()
const databaseSvg = viz.renderString(dot, { format: 'svg', engine: 'dot' })
await writeFile(join(output, 'database-schema.svg'), databaseSvg)
await writeFile(join(output, 'database-schema-full.png'), new Resvg(databaseSvg, { font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Inter' }, fitTo: { mode: 'width', value: 2400 } }).render().asPng())
const overviewFields = new Set(['role', 'code', 'formatted_address', 'status', 'action', 'content', 'availability', 'specialization', 'last_number'])
const overviewTables = snapshot.tables.map(table => ({ ...table, columns: table.columns.filter(column =>
  keysFor(table.table_name, 'PRIMARY KEY').includes(column.name) ||
  snapshot.foreignKeys.some(fk => fk.table_name === table.table_name && fk.column_name === column.name) ||
  overviewFields.has(column.name)) }))
const overviewDot = schemaDot(overviewTables, false)
await writeFile(join(source, 'database-schema-overview.dot'), overviewDot)
const overviewSvg = viz.renderString(overviewDot, { format: 'svg', engine: 'dot' })
await writeFile(join(output, 'database-schema-overview.svg'), overviewSvg)
await writeFile(join(output, 'database-schema.png'), new Resvg(overviewSvg, { font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Inter' }, fitTo: { mode: 'width', value: 2000 } }).render().asPng())

// A UML use-case model. Associations, includes, extensions and inheritance
// are kept as structured data so the SVG and PlantUML describe the same model.
const actors = [
  { id: 'customer', name: 'Customer', role: 'USER', x: 130, y: 430, cases: ['services', 'report', 'review'] },
  { id: 'technician', name: 'Technician', role: 'TECHNICIAN', x: 130, y: 930, cases: ['assignments', 'profile', 'work'] },
  { id: 'dispatcher', name: 'Dispatcher', role: 'DISPATCHER', x: 130, y: 1450, cases: ['createIncident', 'assign', 'closeIncident', 'operations'] },
  { id: 'administrator', name: 'Administrator', role: 'ADMIN', x: 130, y: 1970, cases: ['accounts', 'provision', 'network'] }
]
const useCases = [
  ['services', 'View own services', 590, 290],
  ['report', 'Report a service problem', 590, 430],
  ['eligibleService', 'Check service ownership|and active status', 1200, 430],
  ['review', 'Review a resolved report', 590, 570],
  ['confirm', 'Confirm the repair', 1200, 540],
  ['stillBroken', 'Report still not working', 1200, 650],
  ['assignments', 'View assigned reports|and assignment map', 590, 790],
  ['profile', 'Update own technician profile', 590, 930],
  ['work', 'Start / resolve assigned report', 590, 1070],
  ['assignmentChecks', 'Check assignment|and started incident', 1200, 1010],
  ['email', 'Send resolution email', 1200, 1120],
  ['createIncident', 'Create incident from reports', 590, 1280],
  ['linkReports', 'Select and link eligible reports', 1200, 1280],
  ['assign', 'Assign a technician', 590, 1420],
  ['available', 'Check enabled technician|and AVAILABLE status', 1200, 1420],
  ['closeIncident', 'Close an incident', 590, 1560],
  ['closedReports', 'Check all linked reports|are closed', 1200, 1560],
  ['operations', 'View operations and audit logs', 590, 1690],
  ['accounts', 'Manage accounts and roles', 590, 1840],
  ['provision', 'Provision a customer service', 590, 1980],
  ['location', 'Verify the installation address', 1200, 1920],
  ['node', 'Select a network node', 1200, 2060],
  ['network', 'Manage network nodes', 590, 2120]
].map(([id, label, x, y]) => ({ id, label, x, y, rx: x > 1000 ? 245 : 190 }))
const relations = [
  { from: 'report', to: 'eligibleService', type: 'include', path: 'M780 430H955', x: 866, y: 409 },
  { from: 'confirm', to: 'review', type: 'extend', guard: 'repair works', path: 'M955 540H860V555H778', x: 866, y: 518 },
  { from: 'stillBroken', to: 'review', type: 'extend', guard: 'problem remains', path: 'M955 650H850V590H775', x: 866, y: 683 },
  { from: 'work', to: 'assignmentChecks', type: 'include', path: 'M780 1070H866V1010H955', x: 867, y: 988 },
  { from: 'email', to: 'work', type: 'extend', guard: 'resolved; mail on; demo off', path: 'M955 1120H866V1085H778', x: 866, y: 1153 },
  { from: 'createIncident', to: 'linkReports', type: 'include', path: 'M780 1280H955', x: 866, y: 1258 },
  { from: 'assign', to: 'available', type: 'include', path: 'M780 1420H955', x: 866, y: 1398 },
  { from: 'closeIncident', to: 'closedReports', type: 'include', path: 'M780 1560H955', x: 866, y: 1538 },
  { from: 'provision', to: 'location', type: 'include', path: 'M780 1980H866V1920H955', x: 866, y: 1898 },
  { from: 'provision', to: 'node', type: 'include', path: 'M780 1980H850V2060H955', x: 866, y: 2092 }
]
const model = { actors, useCases, relations, generalizations: [{ from: 'administrator', to: 'dispatcher' }], precondition: 'All roles sign in; access is checked by the backend.' }
await writeFile(join(source, 'use-cases.json'), JSON.stringify(model, null, 2) + '\n')
let puml = '@startuml\nleft to right direction\nskinparam shadowing false\n'
for (const actor of actors) puml += `actor "${actor.name}\\n(${actor.role})" as ${actor.id}\n`
puml += 'rectangle "Linoryx" {\n'
for (const item of useCases) puml += `usecase "${item.label.replaceAll('|', '\\n')}" as ${item.id}\n`
puml += '}\n'
for (const actor of actors) for (const id of actor.cases) puml += `${actor.id} -- ${id}\n`
for (const relation of relations) puml += `${relation.from} ..> ${relation.to} : <<${relation.type}>>${relation.guard ? '\\n[' + relation.guard + ']' : ''}\n`
puml += 'administrator --|> dispatcher\n@enduml\n'
await writeFile(join(source, 'use-cases.puml'), puml)
const t = (x, y, label, size = 24, fill = '#1A1A1A', anchor = 'start', weight = 400) => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}" fill="${fill}">${xml(label)}</text>`
let body = `<rect width="1600" height="2240" rx="20" fill="#F7F5F2"/>${t(52, 72, 'Use-case diagram', 46, '#1A1A1A', 'start', 600)}${t(52, 115, 'All four roles · Required steps and optional actions', 26, '#6B6B6B')}<rect x="280" y="170" width="1270" height="2010" rx="16" fill="#FFFFFF" stroke="#D6D2CC" stroke-width="2"/>${t(310, 214, 'Linoryx system', 25, '#1A1A1A', 'start', 600)}`
for (const y of [710, 1190, 1770]) body += `<path d="M300 ${y}H1530" stroke="#E7E2DC" stroke-dasharray="8 8"/>`
for (const actor of actors) {
  const y = actor.y - 56
  body += `<circle cx="${actor.x}" cy="${y}" r="17" fill="none" stroke="#1A1A1A" stroke-width="3"/><path d="M${actor.x} ${y + 17}v48m-27-29h54m-27 29-25 30m25-30 25 30" stroke="#1A1A1A" stroke-width="3" fill="none"/>${t(actor.x, actor.y + 63, actor.name, 24, '#1A1A1A', 'middle', 600)}${t(actor.x, actor.y + 91, actor.role, 18, '#6B6B6B', 'middle')}`
  for (const id of actor.cases) {
    const item = useCases.find(item => item.id === id)
    body += `<path d="M160 ${actor.y - 5}H340V${item.y}H${item.x - item.rx}" stroke="#A09890" stroke-width="1.7" fill="none"/>`
  }
}
// The administrator has all dispatcher permissions, but does not inherit USER
// or TECHNICIAN permissions. The hollow triangle is actor generalization.
body += `<path d="M113 1914H40V1430H100" fill="none" stroke="#80766E" stroke-width="2" marker-end="url(#generalization)"/>${t(53, 1740, 'inherits', 18, '#6B6B6B')}`
for (const relation of relations) {
  body += `<path d="${relation.path}" fill="none" stroke="#B74335" stroke-width="2" stroke-dasharray="8 6" marker-end="url(#open-arrow)"/>${t(relation.x, relation.y, '«' + relation.type + '»', 21, '#B74335', 'middle')}`
  if (relation.guard) body += t(relation.x, relation.y + 24, '[' + relation.guard + ']', 17, '#6B6B6B', 'middle')
}
for (const item of useCases) {
  body += `<ellipse cx="${item.x}" cy="${item.y}" rx="${item.rx}" ry="43" fill="${item.x > 1000 ? '#F8F0EB' : '#F7F5F2'}" stroke="#D6D2CC" stroke-width="1.7"/>`
  const labels = item.label.split('|')
  labels.forEach((label, index) => { body += t(item.x, item.y + 8 + (index - (labels.length - 1) / 2) * 29, label, 23, '#1A1A1A', 'middle') })
}
const useCaseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2240" viewBox="0 0 1600 2240" role="img" aria-label="UML use cases for Customer, Technician, Dispatcher and Administrator"><defs><marker id="open-arrow" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1l10 5-10 5" stroke="#B74335" stroke-width="2" fill="none"/></marker><marker id="generalization" markerWidth="17" markerHeight="17" refX="16" refY="8" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1l15 7-15 7z" stroke="#80766E" stroke-width="2" fill="#F7F5F2"/></marker></defs><g font-family="Inter, Arial, sans-serif">${body}</g></svg>`
await writeFile(join(output, 'use-cases.svg'), useCaseSvg)
await writeFile(join(output, 'use-cases.png'), new Resvg(useCaseSvg, { font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng())
console.log(`Rendered schema (${snapshot.tables.length} tables / ${snapshot.foreignKeys.length} foreign keys) and UML (${actors.length} roles / ${useCases.length} use cases / ${relations.length} includes and extensions).`)
