const { readFileSync } = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '../..')
const binding = require('node-gyp-build')(root)

try {
  binding.nodeTypeInfo = require('../../src/node-types.json')
} catch {}

const queries = [
  ['HIGHLIGHTS_QUERY', path.join(root, 'queries/highlights.scm')],
  ['INJECTIONS_QUERY', path.join(root, 'queries/injections.scm')],
  ['LOCALS_QUERY', path.join(root, 'queries/locals.scm')],
  ['TAGS_QUERY', path.join(root, 'queries/tags.scm')],
]

for (const [property, queryPath] of queries) {
  Object.defineProperty(binding, property, {
    configurable: true,
    enumerable: true,
    get() {
      delete binding[property]
      try {
        binding[property] = readFileSync(queryPath, 'utf8')
      } catch {}
      return binding[property]
    },
  })
}

module.exports = binding
