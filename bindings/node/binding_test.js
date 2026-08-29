const assert = require('node:assert/strict')
const test = require('node:test')
const Parser = require('tree-sitter')
const Quint = require('./')

test('loads and parses a Quint module', () => {
  const parser = new Parser()
  parser.setLanguage(Quint)
  const tree = parser.parse('module Example { val answer = 42 }')
  assert.equal(tree.rootNode.type, 'source_file')
  assert.equal(tree.rootNode.hasError, false)
  assert.equal(tree.rootNode.namedChild(0).type, 'module')
})
