import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Parser from 'tree-sitter'
import Quint from '../../bindings/node/index.js'

const expectedCommit = 'fd772606588b40def9978d8c82da69c2db7a0e3b'
const [upstreamRoot] = process.argv.slice(2)
assert.ok(upstreamRoot, 'usage: check-upstream-sources.mjs <quint-checkout>')
assert.equal(
  execFileSync('git', ['-C', upstreamRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  expectedCommit,
)

const manifest = JSON.parse(fs.readFileSync(
  new URL('../upstream/quint-0.32.0/valid-sources.json', import.meta.url),
  'utf8',
))
assert.equal(manifest.version, '0.32.0')
assert.equal(manifest.commit, expectedCommit)
assert.equal(manifest.totalSources, 184)
assert.equal(manifest.validSources.length, 179)
assert.equal(manifest.invalidSources.length, 5)

const parser = new Parser()
parser.setLanguage(Quint)
const failures = []

function firstBad(node) {
  if (node.type === 'ERROR' || node.isMissing) return node
  for (const child of node.children) {
    const bad = firstBad(child)
    if (bad) return bad
  }
}

for (const entry of manifest.validSources) {
  const sourcePath = path.join(upstreamRoot, entry.path)
  const source = fs.readFileSync(sourcePath, 'utf8')
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), entry.sha256, entry.path)
  const tree = parser.parse(source)
  const bad = firstBad(tree.rootNode)
  if (bad) failures.push({
    path: entry.path,
    type: bad.type,
    row: bad.startPosition.row + 1,
    column: bad.startPosition.column + 1,
  })
}

assert.deepEqual(failures, [])
console.log(`upstream Quint ${manifest.version}: ${manifest.validSources.length} valid sources`)
