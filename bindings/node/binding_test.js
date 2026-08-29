const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')
const Parser = require('tree-sitter')
const Quint = require('./')

const projectRoot = path.join(__dirname, '../..')

function createTestPackage({ nodeTypes, highlights, injectionDirectory = false }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-sitter-quint-binding-'))
  fs.mkdirSync(path.join(root, 'bindings/node'), { recursive: true })
  fs.mkdirSync(path.join(root, 'build/Release'), { recursive: true })
  fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  fs.mkdirSync(path.join(root, 'queries'), { recursive: true })
  fs.copyFileSync(path.join(__dirname, 'index.js'), path.join(root, 'bindings/node/index.js'))
  fs.copyFileSync(
    path.join(projectRoot, 'build/Release/tree_sitter_quint_binding.node'),
    path.join(root, 'build/Release/tree_sitter_quint_binding.node'),
  )

  if (nodeTypes !== undefined) {
    fs.writeFileSync(path.join(root, 'src/node-types.json'), nodeTypes)
  }
  if (highlights !== undefined) {
    fs.writeFileSync(path.join(root, 'queries/highlights.scm'), highlights)
  }
  if (injectionDirectory) {
    fs.mkdirSync(path.join(root, 'queries/injections.scm'))
  }

  return root
}

function loadTestPackage(root, expression = 'require(packagePath)') {
  return spawnSync(
    process.execPath,
    ['-e', `const packagePath = ${JSON.stringify(path.join(root, 'bindings/node'))}; ${expression}`],
    {
      encoding: 'utf8',
      env: { ...process.env, NODE_PATH: path.join(projectRoot, 'node_modules') },
    },
  )
}

test('loads and parses a Quint module', () => {
  const parser = new Parser()
  parser.setLanguage(Quint)
  const tree = parser.parse('module Example { val answer = 42 }')
  assert.equal(tree.rootNode.type, 'source_file')
  assert.equal(tree.rootNode.hasError, false)
  assert.equal(tree.rootNode.namedChild(0).type, 'module')
  assert.ok(Quint.nodeTypeInfo.length > 0)
  assert.doesNotThrow(() => new Parser.Query(Quint, Quint.HIGHLIGHTS_QUERY))
})

test('fails when required node type metadata is missing', t => {
  const root = createTestPackage({ highlights: '(module) @module' })
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))

  const result = loadTestPackage(root)

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /ENOENT.*node-types\.json/s)
})

test('fails when required node type metadata is malformed', t => {
  const root = createTestPackage({ nodeTypes: '{', highlights: '(module) @module' })
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))

  const result = loadTestPackage(root)

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /SyntaxError/)
})

test('fails when the required highlight query is missing', t => {
  const root = createTestPackage({ nodeTypes: '[]' })
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))

  const result = loadTestPackage(root)

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /ENOENT.*highlights\.scm/s)
})

test('allows optional queries to be absent', t => {
  const root = createTestPackage({ nodeTypes: '[]', highlights: '(module) @module' })
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))

  const result = loadTestPackage(
    root,
    "const binding = require(packagePath); if (binding.INJECTIONS_QUERY !== undefined || binding.LOCALS_QUERY !== undefined || binding.TAGS_QUERY !== undefined) process.exit(2)",
  )

  assert.equal(result.status, 0, result.stderr)
})

test('does not hide optional query read errors other than missing files', t => {
  const root = createTestPackage({
    nodeTypes: '[]',
    highlights: '(module) @module',
    injectionDirectory: true,
  })
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))

  const result = loadTestPackage(root, 'require(packagePath).INJECTIONS_QUERY')

  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /EISDIR/)
})
