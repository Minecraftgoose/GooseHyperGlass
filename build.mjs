// Build script: bundles src-bundle + liquid-glass-webgl into a single
// browser IIFE. No React — aliased to empty stub.
//
// Prerequisites: npm install esbuild
// Run: node build.mjs
import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: [path.join(__dirname, 'src-bundle/liquid-glass.ts')],
  bundle: true,
  outfile: path.join(__dirname, '../liquid-glass-cdn-clean/liquid-glass.js'),
  format: 'iife',
  platform: 'browser',
  target: ['es2019'],
  alias: { react: path.join(__dirname, 'src-bundle/empty-react.ts') },
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
  legalComments: 'none',
  logLevel: 'info',
})
console.log('built liquid-glass.js -> ../liquid-glass-cdn-clean/liquid-glass.js')
