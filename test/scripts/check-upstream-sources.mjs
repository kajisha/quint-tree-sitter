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

const realUpstreamRoot = fs.realpathSync(upstreamRoot)
const trackedSources = execFileSync(
  'git',
  ['-C', realUpstreamRoot, 'ls-files', '-z', '--', '*.qnt'],
  { encoding: 'utf8' },
).split('\0').filter(Boolean).sort()
const validPaths = manifest.validSources.map(entry => entry.path)
const invalidPaths = manifest.invalidSources.map(entry => entry.path)

assert.equal(new Set(validPaths).size, validPaths.length, 'validSources paths must be unique')
assert.equal(new Set(invalidPaths).size, invalidPaths.length, 'invalidSources paths must be unique')
const validPathSet = new Set(validPaths)
assert.deepEqual(
  invalidPaths.filter(sourcePath => validPathSet.has(sourcePath)),
  [],
  'validSources and invalidSources must be disjoint',
)

const sources = new Map()
for (const entry of [...manifest.validSources, ...manifest.invalidSources]) {
  assert.equal(typeof entry.path, 'string', 'source path must be a string')
  assert.ok(entry.path.length > 0, 'source path must not be empty')
  assert.ok(!path.isAbsolute(entry.path), `source path must be relative: ${entry.path}`)
  assert.equal(entry.path, entry.path.replaceAll('\\', '/'), `source path must use forward slashes: ${entry.path}`)
  assert.equal(path.posix.normalize(entry.path), entry.path, `source path traversal is forbidden: ${entry.path}`)

  const sourcePath = path.resolve(realUpstreamRoot, entry.path)
  const relativePath = path.relative(realUpstreamRoot, sourcePath)
  assert.ok(
    relativePath.length > 0 && relativePath !== '..' && !relativePath.startsWith(`..${path.sep}`)
      && !path.isAbsolute(relativePath),
    `source path escapes the pinned checkout: ${entry.path}`,
  )
  const realSourcePath = fs.realpathSync(sourcePath)
  const realRelativePath = path.relative(realUpstreamRoot, realSourcePath)
  assert.ok(
    realRelativePath.length > 0 && realRelativePath !== '..'
      && !realRelativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(realRelativePath),
    `source resolves outside the pinned checkout: ${entry.path}`,
  )

  const source = fs.readFileSync(realSourcePath, 'utf8')
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), entry.sha256, entry.path)
  sources.set(entry.path, source)
}

assert.deepEqual(
  [...validPaths, ...invalidPaths].sort(),
  trackedSources,
  'manifest must list every tracked .qnt source exactly once',
)

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
  const source = sources.get(entry.path)
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
