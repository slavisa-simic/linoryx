import { createRequire } from 'node:module'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Optional tooling stays separate from the application dependencies.
// node scripts/build-readme-visuals.mjs <tooling-directory>/node_modules
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(resolve(process.argv[2] || root), 'package.json'))
const sharp = require('sharp')
const { Resvg } = require('@resvg/resvg-js')
const { GIFEncoder, quantize, applyPalette } = require('gifenc')
const output = join(root, 'docs/readme/visuals')
const source = join(output, 'source')
await mkdir(source, { recursive: true })

const color = { ink: '#1A1A1A', accent: '#D05445', pale: '#F1E5E0', canvas: '#F7F5F2', border: '#D6D2CC', muted: '#6B6B6B', white: '#FFFFFF' }
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const text = (x, y, value, size = 22, fill = color.ink, weight = 400, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" ${extra}>${escape(value)}</text>`
const rect = (x, y, width, height, fill = color.white, radius = 14, stroke = color.border) => `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`
const line = (x1, y1, x2, y2, stroke = color.border, width = 2, extra = '') => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${stroke}" stroke-width="${width}" fill="none" ${extra}/>`
const circle = (x, y, radius, fill = color.pale, stroke = 'none') => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" stroke="${stroke}"/>`
const logoSource = await readFile(join(root, 'linoryx-web/public/brand/linoryx-logo.svg'), 'utf8')
const logo = logoSource.replace(/^<svg[^>]*>/, '<svg x="1010" y="26" width="140" height="39" viewBox="0 0 452 124">')
const arrow = (x, y) => `<path d="M${x} ${y}h26m-8-7 8 7-8 7" fill="none" stroke="${color.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`

function frame(title, subtitle, content, height = 330) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-label="${escape(title)}"><rect width="1200" height="${height}" rx="18" fill="${color.canvas}"/><g font-family="Inter, Arial, sans-serif">${logo}${text(48, 76, title, 40, color.ink, 600)}${text(48, 113, subtitle, 21, color.muted)}${line(48, 139, 1152, 139)}${content}</g></svg>`
}

function person(x, y) {
  return circle(x, y - 9, 8, 'none', color.accent) + `<path d="M${x - 15} ${y + 17}v-4a15 12 0 0 1 30 0v4" stroke="${color.accent}" stroke-width="2.5" fill="none"/>`
}

const dashboard = frame('Dashboard.', 'Incident activity, priorities and team workload in one view.',
  rect(48, 166, 220, 122) + text(70, 196, 'Total incidents', 19, color.muted) + text(70, 253, '183', 43, color.ink, 600) +
  rect(286, 166, 220, 122) + text(308, 196, 'Active incidents', 19, color.muted) + text(308, 253, '110', 43, color.ink, 600) +
  rect(524, 166, 360, 122) + `<path d="M547 265l31-9 30-43 32 21 34-37 34 18 32-36 34 42 32-13 30 35 26-8" fill="none" stroke="${color.accent}" stroke-width="3"/>` +
  line(546, 269, 859, 269) + text(544, 191, 'Incident activity', 19, color.muted) +
  rect(902, 166, 250, 122) + text(925, 196, 'Closure rate', 19, color.muted) + text(925, 253, '40%', 43, color.ink, 600))

const roles = frame('One team. Clear roles.', 'The right workspace for each person.',
  [['Customer', 'Services & reports'], ['Technician', 'Assigned repairs'], ['Dispatcher', 'Incident coordination'], ['Administrator', 'Accounts & network']].map(([name, scope], index) => {
    const x = 48 + index * 281
    return rect(x, 165, 261, 125) + person(x + 32, 202) + text(x + 60, 202, name, 22, color.ink, 600) + text(x + 20, 263, scope, 19, color.muted)
  }).join(''))

function workflow(active = -1) {
  return frame('From report to repair.', 'Report. Assign. Resolve. Confirm.',
    [['OPEN', 'Customer reports'], ['IN_PROGRESS', 'Technician works'], ['RESOLVED', 'Customer confirms'], ['CLOSED', 'Operator closes']].map(([name, detail], index) => {
      const x = 48 + index * 283
      const selected = active === index
      return rect(x, 174, 235, 112, selected ? color.pale : color.white, 14, selected ? color.accent : color.border) +
        circle(x + 25, 199, 5, selected ? color.accent : color.border) + text(x + 18, 229, name, 23, color.ink, 600) + text(x + 18, 262, detail, 18, color.muted) +
        (index < 3 ? arrow(x + 244, 232) : '')
    }).join(''))
}

const architecture = frame('Built on a clear stack.', 'React on the frontend. Spring Boot behind it. PostgreSQL for data.',
  [['React', 'TypeScript + Vite'], ['Spring Boot', 'Java + REST API'], ['PostgreSQL', 'Application data']].map(([name, detail], index) => {
    const x = 48 + index * 386
    return rect(x, 172, 330, 118) + text(x + 24, 216, name, 29, color.ink, 600) + text(x + 24, 258, detail, 21, color.muted) + (index < 2 ? arrow(x + 343, 230) : '')
  }).join(''))

const local = frame('Run it locally.', 'Build the apps, start Docker and open localhost.',
  rect(48, 166, 560, 127) + circle(71, 188, 4, color.accent) + circle(86, 188, 4, color.border) + circle(101, 188, 4, color.border) +
  text(72, 229, '> docker compose up -d', 25, color.ink, 500) + text(72, 268, 'localhost:8081', 21, color.muted) +
  arrow(631, 231) + [['web', '8081'], ['api', '8080'], ['db', '5433']].map(([name, port], index) => {
    const x = 694 + index * 157
    return rect(x, 174, 141, 112) + text(x + 18, 213, name, 25, color.ink, 600) + text(x + 18, 259, port, 24, color.muted)
  }).join(''))

const testing = frame('Check the work.', 'Backend tests, frontend tests, lint and a production build.',
  [['Backend', 'mvnw clean verify'], ['Frontend', 'npm test'], ['Code checks', 'npm run lint'], ['Build', 'npm run build']].map(([title, command], index) => {
    const x = 48 + index * 281
    return rect(x, 172, 261, 116) + `<path d="M${x + 20} 201l6 6 12-14" stroke="${color.accent}" stroke-width="3" fill="none"/>` +
      text(x + 48, 208, title, 23, color.ink, 600) + text(x + 19, 259, command, 20, color.muted)
  }).join(''))

const upgrade = frame('New identity. Same data.', 'Update the module paths and rebuild the Docker images.',
  rect(48, 173, 398, 112) + text(72, 215, 'linoryx-api', 28, color.ink, 600) + text(72, 259, 'linoryx-web', 28, color.ink, 600) +
  arrow(473, 228) + rect(534, 173, 280, 112, color.pale) + text(558, 216, 'Rebuild', 28, color.ink, 600) + text(558, 257, 'Docker images', 21, color.muted) +
  arrow(837, 228) + rect(898, 173, 254, 112) + text(921, 216, 'Keep', 28, color.ink, 600) + text(921, 257, 'Database volume', 21, color.muted))

const documentation = frame('Find the details.', 'Small guides for setup, features and the Linoryx brand.',
  [['Brand', 'Identity & styles'], ['Services', 'Network & reports'], ['Technicians', 'Profiles & assignments'], ['Demo data', 'Local sample records']].map(([title, detail], index) => {
    const x = 48 + index * 281
    return rect(x, 172, 261, 116) + `<path d="M${x + 20} 196h17l8 8v26h-25zM${x + 37} 196v9h8" stroke="${color.accent}" stroke-width="2" fill="none"/>` +
      text(x + 60, 218, title, 24, color.ink, 600) + text(x + 20, 263, detail, 18, color.muted)
  }).join(''))

const roadmap = frame('What comes next.', 'Planned improvements for the project.',
  line(100, 208, 1100, 208, color.border, 3) + [['Hosted demo', 'Cloud deployment'], ['Product tour', 'More screenshots & video'], ['CI/CD', 'Automated checks']].map(([title, detail], index) => {
    const x = 95 + index * 470
    return circle(x, 208, 10, color.canvas, color.accent) + text(x - 45, 253, title, 26, color.ink, 600) + text(x - 45, 287, detail, 19, color.muted)
  }).join(''))

const diagrams = { dashboard, roles, workflow: workflow(), architecture, 'run-locally': local, testing, upgrade, documentation, roadmap }
const fontFiles = ['Inter-Regular.ttf', 'Inter-Medium.ttf', 'Inter-SemiBold.ttf', 'Inter-Bold.ttf'].map(name => join(root, 'linoryx-web/public/fonts', name))
const render = svg => new Resvg(svg, { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Inter' } }).render().asPng()
for (const [name, svg] of Object.entries(diagrams)) {
  await writeFile(join(source, name + '.svg'), svg)
  await writeFile(join(output, name + '.png'), render(svg))
}

// Four state highlights show the real report sequence without browser scripts.
const flowGif = GIFEncoder()
for (let state = 0; state < 4; state++) {
  const pixels = await sharp(render(workflow(state))).flatten({ background: color.white }).ensureAlpha().raw().toBuffer()
  const palette = quantize(pixels, 128)
  flowGif.writeFrame(applyPalette(pixels, palette), 1200, 330, { palette, delay: 1800, repeat: 0 })
}
flowGif.finish()
await writeFile(join(output, 'workflow.gif'), flowGif.bytes())

// One compact, four-slide header: brand intro, project, integrations, devices.
// Same self-contained SMIL image-track animation as the profile repository:
// https://github.com/slavisa-simic/slavisa-simic/blob/main/scripts/build_carousel.py
const slideNames = ['intro', 'overview', 'integrations', 'responsive']
const width = 1200
const height = 400
const holdMs = 4000
const transitionMs = 400
for (const name of slideNames) await sharp(join(output, name + '.png')).resize(1600).webp({ quality: 90 }).toFile(join(output, name + '.webp'))
const slideImages = await Promise.all(slideNames.map(async name => 'data:image/webp;base64,' + (await readFile(join(output, name + '.webp'))).toString('base64')))

function headerCarousel(reduced = false) {
  const duration = slideNames.length * (holdMs + (reduced ? 0 : transitionMs))
  const values = ['0 0']
  const times = [0]
  const splines = []
  if (reduced) {
    for (let i = 1; i <= slideNames.length; i++) {
      values.push(`${-i * width} 0`)
      times.push(i / slideNames.length)
    }
  } else {
    for (let i = 0; i < slideNames.length; i++) {
      values.push(`${-i * width} 0`, `${-(i + 1) * width} 0`)
      times.push((i * (holdMs + transitionMs) + holdMs) / duration, (i + 1) * (holdMs + transitionMs) / duration)
      splines.push('0 0 1 1', '0.22 1 0.36 1')
    }
  }
  const precision = values => values.map(value => Number(value.toFixed(8))).join(';')
  const images = [...slideImages, slideImages[0]].map((uri, index) => `<image href="${uri}" x="${index * width}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`).join('')
  const motion = `<animateTransform attributeName="transform" type="translate" begin="0s" values="${values.join(';')}" keyTimes="${precision(times)}" ${reduced ? 'calcMode="discrete"' : `calcMode="spline" keySplines="${splines.join(';')}"`} dur="${duration / 1000}s" repeatCount="indefinite"/>`
  const switches = reduced ? [0, .25, .5, .75, 1] : [0, ...slideNames.map((_, i) => (i * (holdMs + transitionMs) + holdMs + transitionMs / 2) / duration), 1]
  const indicators = slideNames.map((_, index) => {
    const states = reduced ? Array.from({ length: 5 }, (_, i) => Number(i % 4 === index)) : [Number(index === 0), ...slideNames.map((_, i) => Number((i + 1) % 4 === index)), Number(index === 0)]
    const cx = 561 + index * 26
    return `<circle cx="${cx}" cy="378" r="3" fill="#B7ABA3"/><rect x="${cx - 8}" y="375.5" width="16" height="5" rx="2.5" fill="${index === 0 ? '#FFF0DF' : color.ink}" opacity="${states[0]}"><animate attributeName="opacity" begin="0s" values="${states.join(';')}" keyTimes="${precision(switches)}" calcMode="discrete" dur="${duration / 1000}s" repeatCount="indefinite"/></rect>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>Linoryx project carousel</title><desc>Automatically cycles through the red telecom introduction, full-stack project, external API integrations and responsive design. Each slide is held for four seconds. The animation repeats continuously.</desc><defs><clipPath id="carousel-frame"><rect width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#carousel-frame)"><g id="carousel-track">${images}${motion}</g></g>${indicators}</svg>\n`
}
await writeFile(join(output, 'header-carousel.svg'), headerCarousel())
await writeFile(join(output, 'header-carousel-reduced.svg'), headerCarousel(true))
await writeFile(join(source, 'header-carousel.json'), JSON.stringify({ format: 'svg', animation: 'SMIL', width, height, holdMs, transitionMs, durationMs: slideNames.length * (holdMs + transitionMs), transition: 'slide-left', repeat: 'indefinite', controls: false, slides: slideNames, reference: 'https://github.com/slavisa-simic/slavisa-simic/blob/main/scripts/build_carousel.py' }, null, 2) + '\n')
const sections = [
  ['product-preview', 'Product preview', 'chart'],
  ['responsive-design', 'Responsive design', 'devices'],
  ['external-integrations', 'External API integrations', 'connections'],
  ['existing-features', 'Existing features', 'cards'],
  ['roles', 'Roles', 'people'],
  ['use-case-diagram', 'Use-case diagram', 'connections'],
  ['workflows', 'Workflows', 'connections'],
  ['architecture-and-stack', 'Architecture and stack', 'connections'],
  ['database-schema', 'Database schema', 'database'],
  ['run-locally', 'Run locally', 'terminal'],
  ['testing', 'Testing', 'checks'],
  ['upgrading', 'Upgrading an existing checkout', 'connections'],
  ['documentation', 'Further documentation', 'cards'],
  ['roadmap', 'Roadmap', 'connections']
]

function titleGraphic(title, kind, phase = 1) {
  const right = 925
  const iconStroke = `fill="none" stroke="${color.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`
  let icon = ''
  if (kind === 'database') {
    icon = `<ellipse cx="1000" cy="39" rx="53" ry="15" ${iconStroke}/><path d="M947 39v50c0 20 106 20 106 0V39M947 64c0 20 106 20 106 0" ${iconStroke}/>`
  } else if (kind === 'terminal') {
    icon = rect(right, 26, 188, 81, color.white, 10) + text(right + 20, 77, '> _'.slice(0, phase > .3 ? 3 : 1), 30, color.accent, 500)
  } else if (kind === 'devices') {
    icon = rect(right, 34, 105, 62, 'none', 5, color.accent) + rect(right + 115, 25, 53, 78, 'none', 5, color.accent) + rect(right + 174, 50, 30, 53, 'none', 5, color.accent)
  } else if (kind === 'chart') {
    icon = line(right, 100, right + 192, 100) + `<path d="M${right} 87l30-13 32 8 35-49 31 20 34-27 29 14" ${iconStroke} stroke-dasharray="280" stroke-dashoffset="${(1 - phase) * 230}"/>`
  } else if (kind === 'people') {
    icon = [0, 1, 2].map(i => person(right + 35 + i * 65, 64)).join('')
  } else if (kind === 'checks') {
    icon = [0, 1, 2].map(i => rect(right + i * 66, 41, 48, 48, color.white, 8) + (phase * 3 >= i + .3 ? `<path d="M${right + i * 66 + 10} 65l9 9 19-22" ${iconStroke}/>` : '')).join('')
  } else if (kind === 'cards') {
    icon = [0, 1, 2].map(i => rect(right + i * 65, 34 + i * 3, 50, 65, phase * 3 >= i + .3 ? color.pale : color.white, 6) + line(right + i * 65 + 10, 58 + i * 3, right + i * 65 + 39, 58 + i * 3)).join('')
  } else {
    icon = line(right + 18, 67, right + 183, 67) + [0, 1, 2].map(i => circle(right + 18 + i * 82, 67, 12, color.white, color.accent)).join('') + circle(right + 18 + phase * 164, 67, 6, color.accent)
  }
  const size = title.length > 25 ? 43 : 52
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="132" viewBox="0 0 1200 132" role="img" aria-label="${escape(title)}"><rect width="1200" height="132" rx="14" fill="${color.canvas}"/><g font-family="Inter, Arial, sans-serif">${text(40, 81, title, size, color.ink, 600)}${icon}${line(41, 105, 41 + Math.max(24, Math.min(title.length * size * .42, 750) * phase), 105, color.accent, 3)}</g></svg>`
}
for (const [name, title, kind] of sections) {
  const svg = titleGraphic(title, kind)
  await writeFile(join(source, name + '-title.svg'), svg)
  await writeFile(join(output, name + '-title.png'), render(svg))
  const animation = GIFEncoder()
  for (let step = 0; step < 12; step++) {
    const phase = step < 8 ? (step + 1) / 8 : 1
    const pixels = await sharp(render(titleGraphic(title, kind, phase))).flatten({ background: color.white }).ensureAlpha().raw().toBuffer()
    const palette = quantize(pixels, 64)
    animation.writeFrame(applyPalette(pixels, palette), 1200, 132, { palette, delay: step === 11 ? 1800 : 100, repeat: 0 })
  }
  animation.finish()
  await writeFile(join(output, name + '-title.gif'), animation.bytes())
}
console.log('Built section graphics, 14 animated titles, the workflow and a continuously looping SVG carousel.')
