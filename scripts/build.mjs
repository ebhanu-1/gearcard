// Release build, same scheme as ClearSky / Studio Phone. Run from app/ via `npm run build`.
//  - bumps VERSION (1.4 -> 1.5), or `node ../scripts/build.mjs --version 2.0` pins a bigger one, `--no-bump` rebuilds as is
//  - builds one self-contained index.html with Vite, then copies it and the public files (sw.js, manifest, icons)
//    to the repo root, which GitHub Pages serves, and keeps a copy in app/dist
//  - enforces the size budget
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = path.join(root, 'app')
const BUDGET_GZ_KB = 260 // ClearSky's is 200; GearCard carries ~200 KB gzipped of researched content on its own

const args = process.argv.slice(2)
const vArg = args.indexOf('--version')
let version
const cur = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim()
if (vArg > -1 && args[vArg + 1]) version = args[vArg + 1]
else if (args.includes('--no-bump')) version = cur
else { const p = cur.split('.').map(Number); p[p.length - 1] += 1; version = p.join('.') }
if (!/^\d+(\.\d+)+$/.test(version)) throw new Error('bad version ' + version)
fs.writeFileSync(path.join(root, 'VERSION'), version + '\n')

execFileSync('npx', ['vite', 'build'], { cwd: app, stdio: 'inherit', env: { ...process.env, GEARCARD_VERSION: version } })

const dist = path.join(app, 'dist')
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
if (!html.includes(`name="app-version" content="v${version}"`)) throw new Error('built page does not carry the version meta tag')
if (/<script[^>]+src=/.test(html) && !/registerSW/.test(html)) throw new Error('page still references an external script: not single-file')
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
html = html.replace('</head>', `<!-- GearCard v${version} built ${stamp} -->\n</head>`)
fs.writeFileSync(path.join(dist, 'index.html'), html)
for (const f of fs.readdirSync(path.join(app, 'public'))) {
  if (f === 'icon.svg' || f.endsWith('.png') || f === 'sw.js' || f === 'manifest.webmanifest') fs.copyFileSync(path.join(app, 'public', f), path.join(root, f))
}
fs.copyFileSync(path.join(dist, 'index.html'), path.join(root, 'index.html'))

const gz = zlib.gzipSync(html).length
console.log(`v${version}: index.html ${(html.length / 1024).toFixed(1)} KB, ${(gz / 1024).toFixed(1)} KB gzipped (budget ${BUDGET_GZ_KB} KB gzipped)`)
if (gz > BUDGET_GZ_KB * 1024) { console.error('over budget'); process.exit(1) }
