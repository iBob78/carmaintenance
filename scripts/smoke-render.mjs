// Smoke-test de rendu : monte l'app construite dans jsdom et vérifie le contenu.
import { JSDOM } from 'jsdom'
import { readdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const dom = new JSDOM('<!doctype html><html lang="fr"><body><div id="root"></div></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
})

const { window } = dom
globalThis.window = window
globalThis.document = window.document
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
globalThis.localStorage = window.localStorage
globalThis.MutationObserver = window.MutationObserver
globalThis.HTMLElement = window.HTMLElement
globalThis.HTMLInputElement = window.HTMLInputElement
globalThis.Element = window.Element
globalThis.Node = window.Node
globalThis.Event = window.Event
globalThis.CustomEvent = window.CustomEvent
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
globalThis.IS_REACT_ACT_ENVIRONMENT = true

const distDir = path.resolve('dist/assets')
const jsFile = readdirSync(distDir).find((f) => f.endsWith('.js'))
if (!jsFile) throw new Error('Bundle JS introuvable — lancez npm run build')

await import(pathToFileURL(path.join(distDir, jsFile)).href)
await new Promise((r) => setTimeout(r, 800))

const html = window.document.body.innerHTML
const text = window.document.body.textContent ?? ''

const checks = [
  ['AutoCarnet', text.includes('AutoCarnet')],
  ['Tableau de bord', text.includes('Tableau de bord')],
  ['Vidange affichée', text.includes('idange')],
  ['Kilométrage', /km/.test(text)],
  ['Calendrier', text.includes('Calendrier')],
  ['Contenu non vide', html.length > 3000],
]

let ok = true
for (const [label, pass] of checks) {
  console.log(`${pass ? '✅' : '❌'} ${label}`)
  if (!pass) ok = false
}
if (!ok) {
  console.log('--- Extrait du DOM ---')
  console.log(html.slice(0, 2000))
  process.exit(1)
}
console.log(`\nRendu OK — ${html.length} caractères dans #root`)
process.exit(0)
