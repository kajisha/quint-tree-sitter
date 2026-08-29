import fs from 'node:fs'

import Parser from 'tree-sitter'
import Quint from '../../bindings/node/index.js'

const parser = new Parser()
parser.setLanguage(Quint)
const root = new URL('../fixtures/quint-0.32.0/', import.meta.url)
const files = fs.readdirSync(root).filter(name => name.endsWith('.qnt')).sort()

if (files.length === 0) throw new Error('no Quint compatibility fixtures found')
for (const name of files) {
  const source = fs.readFileSync(new URL(name, root), 'utf8')
  const tree = parser.parse(source)
  if (tree.rootNode.hasError) {
    throw new Error(`${name}: ${tree.rootNode.toString()}`)
  }
}
