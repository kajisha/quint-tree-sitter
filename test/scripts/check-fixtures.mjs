import fs from 'node:fs'

import Parser from 'tree-sitter'
import Quint from '../../bindings/node/index.js'

const parser = new Parser()
parser.setLanguage(Quint)
const root = new URL('../fixtures/quint-0.32.0/', import.meta.url)
const files = fs.readdirSync(root).filter(name => name.endsWith('.qnt')).sort()

function firstBad(node) {
  if (node.type === 'ERROR' || node.isMissing) return node
  for (const child of node.children) {
    const bad = firstBad(child)
    if (bad) return bad
  }
}

if (files.length === 0) throw new Error('no Quint compatibility fixtures found')
for (const name of files) {
  const source = fs.readFileSync(new URL(name, root), 'utf8')
  const tree = parser.parse(source)
  const bad = firstBad(tree.rootNode)
  if (bad) {
    throw new Error(
      `${name}: ${bad.type} at row ${bad.startPosition.row}, column ${bad.startPosition.column}: ${tree.rootNode.toString()}`,
    )
  }
}
