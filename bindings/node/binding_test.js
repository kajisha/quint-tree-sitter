const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')
const Parser = require('tree-sitter')
const Quint = require('./')

const projectRoot = path.join(__dirname, '../..')

function namedNodesOfType(node, type, result = []) {
  if (node.type === type) result.push(node)
  for (const child of node.namedChildren) namedNodesOfType(child, type, result)
  return result
}

function alternatingLogicalModule(operatorCount) {
  let expression = 'a0'
  for (let i = 1; i <= operatorCount; i += 1) {
    expression += ` ${i % 2 === 1 ? 'or' : 'and'} a${i}`
  }
  return `module LogicalChain { val result = ${expression} }`
}

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
  assert.equal(Quint.name, 'quint')
})

test('hashbang requires a terminating newline', () => {
  const parser = new Parser()
  parser.setLanguage(Quint)

  const withNewline = parser.parse('#! /usr/bin/env quint run\nmodule Example {}')
  const atEof = parser.parse('#! /usr/bin/env quint run')

  assert.equal(withNewline.rootNode.hasError, false)
  assert.equal(withNewline.rootNode.namedChild(0).type, 'hash_bang_line')
  assert.equal(atEof.rootNode.hasError, true)
})

test('hashbang scanner handles incremental insertion and removal', () => {
  const parser = new Parser()
  parser.setLanguage(Quint)
  const originalSource = 'module Example {}\n'
  const hashbang = '#! quint\n'
  const insertedSource = hashbang + originalSource
  const originalTree = parser.parse(originalSource)

  originalTree.edit({
    startIndex: 0,
    oldEndIndex: 0,
    newEndIndex: hashbang.length,
    startPosition: { row: 0, column: 0 },
    oldEndPosition: { row: 0, column: 0 },
    newEndPosition: { row: 1, column: 0 },
  })
  const insertedTree = parser.parse(insertedSource, originalTree)
  assert.equal(insertedTree.rootNode.hasError, false)
  assert.equal(insertedTree.rootNode.namedChild(0).type, 'hash_bang_line')

  insertedTree.edit({
    startIndex: 0,
    oldEndIndex: hashbang.length,
    newEndIndex: 0,
    startPosition: { row: 0, column: 0 },
    oldEndPosition: { row: 1, column: 0 },
    newEndPosition: { row: 0, column: 0 },
  })
  const removedTree = parser.parse(originalSource, insertedTree)
  assert.equal(removedTree.rootNode.hasError, false)
  assert.equal(removedTree.rootNode.namedChild(0).type, 'module')
})

test('hashbang is rejected after leading extras', () => {
  const parser = new Parser()
  parser.setLanguage(Quint)

  assert.equal(parser.parse('\n#! quint\nmodule Example {}').rootNode.hasError, true)
  assert.equal(parser.parse('// before\n#! quint\nmodule Example {}').rootNode.hasError, true)
})

test('reserved words remain invalid qualId and identOrHole components', () => {
  const parser = new Parser()
  parser.setLanguage(Quint)

  assert.equal(parser.parse('module import {}').rootNode.hasError, true)
  assert.equal(parser.parse('module M { def f(import) = 0 }').rootNode.hasError, true)
  assert.equal(parser.parse('module M { val x = Math::and => 0 }').rootNode.hasError, true)
})

test('alternating logical chains parse fully and incrementally', () => {
  const parser = new Parser()
  parser.setLanguage(Quint)
  const source = alternatingLogicalModule(33)
  const tree = parser.parse(source)

  assert.equal(tree.rootNode.hasError, false)

  const editIndex = source.indexOf(' or ', Math.floor(source.length / 2)) + 1
  const editedSource = `${source.slice(0, editIndex)}and${source.slice(editIndex + 2)}`
  tree.edit({
    startIndex: editIndex,
    oldEndIndex: editIndex + 2,
    newEndIndex: editIndex + 3,
    startPosition: { row: 0, column: editIndex },
    oldEndPosition: { row: 0, column: editIndex + 2 },
    newEndPosition: { row: 0, column: editIndex + 3 },
  })

  assert.equal(parser.parse(editedSource, tree).rootNode.hasError, false)
})

test('incomplete declarations preserve later named declaration siblings', () => {
  const parser = new Parser()
  parser.setLanguage(Quint)
  const source = `module M {
  def broken = {
    val (x, y) = pair
  }
  val later = 1
}`
  const tree = parser.parse(source)
  const definitions = namedNodesOfType(tree.rootNode, 'operator_definition')
  const later = definitions.find(node => node.childForFieldName('name')?.text === 'later')

  assert.ok(later, 'later must remain an independently named operator_definition')
  assert.equal(later.parent.type, 'module')
})

test('unclosed modules preserve the module, operator, and missing brace', () => {
  const parser = new Parser()
  parser.setLanguage(Quint)
  const tree = parser.parse('module Unclosed {\n  val kept = 1')
  const moduleNode = tree.rootNode.namedChildren.find(node => node.type === 'module')

  assert.ok(moduleNode, 'the unclosed module must remain a module node')
  const kept = namedNodesOfType(moduleNode, 'operator_definition')
    .find(node => node.childForFieldName('name')?.text === 'kept')
  const missingBrace = moduleNode.children.find(node => node.type === '}' && node.isMissing)

  assert.ok(kept, 'the kept declaration must remain an operator_definition')
  assert.ok(missingBrace, 'the module must expose a missing closing brace')
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
