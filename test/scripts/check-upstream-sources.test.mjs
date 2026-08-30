import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { after, before, test } from 'node:test'

const repositoryRoot = path.resolve(import.meta.dirname, '../..')
const sourceCheckout = process.env.QUINT_UPSTREAM_CHECKOUT
assert.ok(sourceCheckout, 'QUINT_UPSTREAM_CHECKOUT must name the pinned Quint checkout')
const manifestPath = path.join(repositoryRoot, 'test/upstream/quint-0.32.0/valid-sources.json')
const checkerPath = path.join(repositoryRoot, 'test/scripts/check-upstream-sources.mjs')
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-sitter-quint-manifest-'))
const checkout = path.join(temporaryRoot, 'quint-v0.32.0')
const harnessRoot = path.join(temporaryRoot, 'harness')
const harnessChecker = path.join(harnessRoot, 'test/scripts/check-upstream-sources.mjs')
const harnessManifest = path.join(harnessRoot, 'test/upstream/quint-0.32.0/valid-sources.json')
const originalManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

function sha256(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex')
}

function runChecker(manifest) {
  fs.writeFileSync(harnessManifest, `${JSON.stringify(manifest, null, 2)}\n`)
  return spawnSync(process.execPath, [harnessChecker, checkout], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  })
}

function assertRejected(name, mutate) {
  const manifest = structuredClone(originalManifest)
  mutate(manifest)
  const result = runChecker(manifest)
  assert.notEqual(
    result.status,
    0,
    `${name} mutation was accepted\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  )
}

before(() => {
  const addWorktree = spawnSync('git', [
    '-C', sourceCheckout, 'worktree', 'add', '--detach', checkout,
    originalManifest.commit,
  ], { encoding: 'utf8' })
  assert.equal(addWorktree.status, 0, `${addWorktree.stdout}\n${addWorktree.stderr}`)

  fs.mkdirSync(path.dirname(harnessChecker), { recursive: true })
  fs.mkdirSync(path.dirname(harnessManifest), { recursive: true })
  fs.copyFileSync(checkerPath, harnessChecker)
  fs.symlinkSync(path.join(repositoryRoot, 'bindings'), path.join(harnessRoot, 'bindings'))
  fs.symlinkSync(path.join(repositoryRoot, 'node_modules'), path.join(harnessRoot, 'node_modules'))
})

after(() => {
  spawnSync('git', ['-C', sourceCheckout, 'worktree', 'remove', '--force', checkout])
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
})

test('accepts the pinned unmodified source manifest', () => {
  const result = runChecker(originalManifest)
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
})

test('rejects a duplicate source path', () => {
  assertRejected('duplicate path', manifest => {
    manifest.validSources[1] = { ...manifest.validSources[0] }
  })
})

test('rejects a manifest that omits a tracked source in favor of an untracked copy', () => {
  assertRejected('missing tracked path', manifest => {
    const omitted = manifest.validSources[0]
    const untrackedPath = 'manifest-mutation-extra.qnt'
    fs.copyFileSync(path.join(checkout, omitted.path), path.join(checkout, untrackedPath))
    manifest.validSources[0] = { path: untrackedPath, sha256: omitted.sha256 }
  })
})

test('rejects a path present in both valid and invalid source sets', () => {
  assertRejected('valid-invalid intersection', manifest => {
    manifest.invalidSources[0] = { ...manifest.validSources[0] }
  })
})

test('rejects an invalid source with a changed hash', () => {
  assertRejected('invalid source hash', manifest => {
    manifest.invalidSources[0].sha256 = '0'.repeat(64)
  })
})

test('rejects a source path that escapes the pinned checkout', () => {
  assertRejected('path traversal', manifest => {
    const original = manifest.validSources[0]
    const escapedPath = path.join(temporaryRoot, 'escaped.qnt')
    const contents = fs.readFileSync(path.join(checkout, original.path))
    fs.writeFileSync(escapedPath, contents)
    manifest.validSources[0] = {
      path: path.relative(checkout, escapedPath),
      sha256: sha256(contents),
    }
  })
})
