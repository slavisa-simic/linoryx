import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const tokensPath = new URL('../linoryx-web/src/tokens.css', import.meta.url)
const css = readFileSync(tokensPath, 'utf8')
const tokens = new Map([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))

function resolve(name, visited = new Set()) {
  assert(!visited.has(name), 'Circular color token: ' + name)
  visited.add(name)
  const value = tokens.get(name)
  assert(value, 'Missing color token: ' + name)
  const alias = /^var\((--[\w-]+)\)$/.exec(value)
  return alias ? resolve(alias[1], visited) : value
}

function luminance(hex) {
  assert.match(hex, /^#[\da-f]{6}$/i)
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}

function contrast(foreground, background) {
  const values = [luminance(resolve(foreground)), luminance(resolve(background))].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

const pairs = [
  ['Primary text / canvas', '--color-text', '--color-background', 4.5],
  ['Primary text / card', '--color-text', '--card-background', 4.5],
  ['Muted text / canvas', '--color-text-muted', '--color-background', 4.5],
  ['Muted text / card', '--color-text-muted', '--card-background', 4.5],
  ['Muted text / sidebar', '--color-text-muted', '--color-surface-soft', 4.5],
  ['Placeholder / input', '--color-placeholder', '--color-white', 4.5],
  ['Link / card', '--color-primary', '--color-white', 4.5],
  ['Link hover / card', '--color-primary-hover', '--color-white', 4.5],
  ['Selected navigation', '--color-primary', '--color-primary-light', 4.5],
  ['Primary button', '--button-foreground', '--button-background', 4.5],
  ['Primary button hover', '--button-hover-foreground', '--button-hover-background', 4.5],
  ['Success badge', '--color-success', '--color-success-light', 4.5],
  ['Warning badge', '--color-warning', '--color-warning-light', 4.5],
  ['Error notice', '--color-danger', '--color-danger-light', 4.5],
  ['Information badge', '--color-info', '--color-info-light', 4.5],
  ['Muted text / hover', '--color-text-muted', '--color-surface-hover', 4.5],
  ['Input boundary / card', '--input-border', '--color-white', 3],
  ['Input boundary / canvas', '--input-border', '--color-background', 3],
  ['Focus ring / card', '--color-focus', '--color-white', 3],
  ['Focus ring / canvas', '--color-focus', '--color-background', 3],
  ['Focus ring / selection', '--color-focus', '--color-primary-light', 3],
  ['Brand chart stroke / card', '--chart-accent', '--color-white', 3]
]

for (const [label, foreground, background, minimum] of pairs) {
  const ratio = contrast(foreground, background)
  console.log(`${label}: ${ratio.toFixed(2)}:1 (required ${minimum}:1)`)
  assert(ratio >= minimum, label + ' fails WCAG AA')
}
console.log(`Passed ${pairs.length} contrast pairs from ${fileURLToPath(tokensPath)}.`)
