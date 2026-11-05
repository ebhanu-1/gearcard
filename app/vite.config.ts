import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

// Version comes from the repo-root VERSION file (bumped by scripts/build.mjs), same scheme as ClearSky and Studio Phone.
const fileVersion = (() => {
  try { return readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim() } catch { return '0.0' }
})()
const version = 'v' + (process.env.GEARCARD_VERSION || fileVersion)

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    preact(),
    viteSingleFile(),
    {
      // Put the version in the page itself: the update probe reads it from the live HTML.
      name: 'app-version-meta',
      transformIndexHtml: (html) => html.replace('__VERSION__', version),
    },
  ],
  server: { fs: { allow: ['..'] } },
  test: { include: ['tests/**/*.test.ts'], define: { __APP_VERSION__: JSON.stringify('v0.0-test') } },
})
