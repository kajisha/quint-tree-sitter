import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '../..')
assert.equal(process.versions.node.split('.')[0], '22', 'package verification requires Node 22')
const rootLicense = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8')
const fixtureLicense = fs.readFileSync(
  path.join(root, 'test/fixtures/quint-0.32.0/LICENSE.Quint-Apache-2.0'),
  'utf8',
)
assert.match(rootLicense, /APPENDIX: How to apply the Apache License/)
assert.doesNotMatch(rootLicense, /Igor Konnov|Informal Systems/)
assert.match(fixtureLicense, /Igor Konnov: Informal Systems/)
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-sitter-quint-pack-'))
const packRoot = path.join(temporaryRoot, 'pack')
const consumerRoot = path.join(temporaryRoot, 'consumer')
const npmCommand = process.env.npm_execpath ?? 'npm'
fs.mkdirSync(packRoot)
fs.mkdirSync(consumerRoot)

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', ...options })
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`)
  return result
}

try {
  const pack = run(npmCommand, [
    'pack', '--json', '--ignore-scripts', '--pack-destination', packRoot,
  ])
  const [metadata] = JSON.parse(pack.stdout)
  const paths = new Set(metadata.files.map(file => file.path))
  for (const required of [
    'LICENSE', 'README.md', 'package.json', 'grammar.js', 'tree-sitter.json', 'binding.gyp',
    'bindings/node/binding.cc', 'bindings/node/index.js', 'bindings/node/index.d.ts',
    'queries/highlights.scm', 'src/grammar.json', 'src/node-types.json', 'src/parser.c',
    'src/scanner.c', 'src/tree_sitter/parser.h',
  ]) {
    assert.ok(paths.has(required), `packed artifact is missing ${required}`)
  }
  for (const excludedPrefix of ['build/', 'node_modules/', 'test/', '.github/', '.superpowers/']) {
    assert.ok([...paths].every(file => !file.startsWith(excludedPrefix)), `packed ${excludedPrefix}`)
  }
  assert.ok(!paths.has('test/fixtures/quint-0.32.0/LICENSE.Quint-Apache-2.0'))

  const tarball = path.join(packRoot, metadata.filename)
  fs.writeFileSync(path.join(consumerRoot, 'package.json'), '{"private":true}')
  run(npmCommand, [
    'install', '--offline', '--no-audit', '--no-fund', tarball,
    path.join(root, 'node_modules/tree-sitter'),
  ], { cwd: consumerRoot })
  assert.equal(
    fs.readFileSync(path.join(consumerRoot, 'node_modules/tree-sitter-quint/LICENSE'), 'utf8'),
    rootLicense,
  )
  run(process.execPath, ['-e', `
    const Parser = require('tree-sitter')
    const Quint = require('tree-sitter-quint')
    const parser = new Parser()
    parser.setLanguage(Quint)
    const tree = parser.parse('module Foo::Bar { type T = None def Foo::op(_: int): int = 0 }')
    if (Quint.name !== 'quint' || tree.rootNode.hasError) process.exit(1)
  `], { cwd: consumerRoot })
  console.log(`package smoke: ${metadata.filename} (${paths.size} files)`)
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
