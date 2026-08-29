import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = new URL('../fixtures/quint-0.32.0/', import.meta.url)
const files = fs.readdirSync(root).filter(name => name.endsWith('.qnt')).sort()

if (files.length === 0) throw new Error('no Quint compatibility fixtures found')

const grammar = fileURLToPath(new URL('../../', import.meta.url))
const executable = process.platform === 'win32' ? 'tree-sitter.cmd' : 'tree-sitter'
const treeSitter = path.join(grammar, 'node_modules', '.bin', executable)
const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-sitter-quint-fixtures-'))

try {
  for (const name of files) {
    const fixture = fileURLToPath(new URL(name, root))
    const result = spawnSync(treeSitter, ['parse', '--grammar-path', grammar, '--quiet', fixture], {
      encoding: 'utf8',
      env: { ...process.env, XDG_CACHE_HOME: cache },
    })

    if (result.error) throw result.error
    if (result.status !== 0) {
      const detail = `${result.stdout}${result.stderr}`.trim()
      throw new Error(`${name}: ${detail || `tree-sitter parse exited ${result.status}`}`)
    }
  }
} finally {
  fs.rmSync(cache, { recursive: true, force: true })
}
