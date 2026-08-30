import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const expectedVersion = '0.32.0'
const expectedCommit = 'fd772606588b40def9978d8c82da69c2db7a0e3b'
const expectedGrammarSha256 = '4a7129cfd2e75f115a80cf4c1bb07273d7c3f2728b1f4421ec4112aace07bf36'
const [upstreamRoot, oracleRoot] = process.argv.slice(2)

assert.ok(upstreamRoot && oracleRoot, 'usage: classify-upstream-sources.mjs <quint-checkout> <quint-package-root>')
assert.ok(path.isAbsolute(oracleRoot), 'quint-package-root must be absolute')
assert.equal(
  execFileSync('git', ['-C', upstreamRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  expectedCommit,
)

const require = createRequire(import.meta.url)
const oraclePackage = require(path.join(oracleRoot, 'package.json'))
assert.equal(oraclePackage.version, expectedVersion)

const grammar = fs.readFileSync(path.join(upstreamRoot, 'quint/src/generated/Quint.g4'))
assert.equal(sha256(grammar), expectedGrammarSha256)

const { parsePhase1fromText } = require(
  path.join(oracleRoot, 'dist/src/parsing/quintParserFrontend.js'),
)
const { newIdGenerator } = require(path.join(oracleRoot, 'dist/src/idGenerator.js'))

function sha256(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex')
}

function collectSources(directory, relativeDirectory = '') {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
  const sources = []

  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name)
    const absolutePath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      sources.push(...collectSources(absolutePath, relativePath))
    } else if (entry.isFile() && entry.name.endsWith('.qnt')) {
      sources.push(relativePath)
    }
  }

  return sources
}

const validSources = []
const invalidSources = []
const originalDebug = console.debug

try {
  console.debug = () => {}
  for (const sourcePath of collectSources(upstreamRoot)) {
    const source = fs.readFileSync(path.join(upstreamRoot, sourcePath), 'utf8')
    const entry = { path: sourcePath, sha256: sha256(source) }
    const result = parsePhase1fromText(newIdGenerator(), source, sourcePath)
    ;(result.errors.length === 0 ? validSources : invalidSources).push(entry)
  }
} finally {
  console.debug = originalDebug
}

assert.equal(validSources.length + invalidSources.length, 184)
assert.equal(validSources.length, 179)
assert.equal(invalidSources.length, 5)

const manifest = {
  version: expectedVersion,
  commit: expectedCommit,
  grammarSha256: expectedGrammarSha256,
  totalSources: validSources.length + invalidSources.length,
  validSources,
  invalidSources,
}

process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`)
