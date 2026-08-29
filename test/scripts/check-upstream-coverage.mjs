import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const inventoryPath = path.join(root, 'test/upstream/quint-0.32.0/coverage.json')
const grammarPath = path.join(root, 'src/grammar.json')
const expectedSha = 'fd772606588b40def9978d8c82da69c2db7a0e3b'
const expectedSourceSha256 = '4a7129cfd2e75f115a80cf4c1bb07273d7c3f2728b1f4421ec4112aace07bf36'
const expectedRules = [
  'modules', 'module', 'documentedDeclaration', 'declaration', 'operDef', 'typeDef',
  'typeDefHead', 'sumTypeDefinition', 'typeSumVariant', 'qualifier', 'importMod',
  'exportMod', 'instanceMod', 'moduleName', 'name', 'qualifiedName', 'fromSource',
  'type', 'typeVar', 'row', 'rowLabel', 'typeArgs', 'typeApplication',
  'wrongTypeApplication', 'expr', 'matchSumExpr', 'matchSumCase', 'matchSumVariant',
  'declarationOrExpr', 'lambda', 'lambdaUnsugared', 'lambdaTupleSugar', 'identOrHole',
  'parameter', 'annotatedParameter', 'destructuringPattern', 'tuplePattern',
  'recordPattern', 'identOrStar', 'argList', 'recElem', 'normalCallName', 'nameAfterDot',
  'operator', 'literal', 'qualId', 'simpleId', 'identifier', 'keywordAsID', 'reserved',
  'STRING', 'BOOL', 'INT', 'AND', 'OR', 'IFF', 'IMPLIES', 'LEADS_TO', 'MATCH', 'PLUS',
  'MINUS', 'MUL', 'DIV', 'MOD', 'GT', 'LT', 'GE', 'LE', 'NE', 'EQ', 'ASGN', 'LPAREN',
  'RPAREN', 'SET', 'LIST', 'IMPORT', 'EXPORT', 'FROM', 'AS', 'LOW_ID', 'CAP_ID',
  'HASHBANG_LINE', 'DOCCOMMENT', 'LINE_COMMENT', 'COMMENT', 'WS',
]

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'))
const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'))
const grammarRules = new Set([
  ...Object.keys(grammar.rules),
  ...grammar.externals.map(external => external.name),
])

assert.equal(inventory.upstream.commit, expectedSha)
assert.equal(inventory.upstream.sourceSha256, expectedSourceSha256)
assert.deepEqual(Object.keys(inventory.rules).sort(), expectedRules.sort())

for (const [upstreamRule, mapping] of Object.entries(inventory.rules)) {
  assert.ok(mapping.alternatives?.length > 0, `${upstreamRule}: alternatives are required`)
  assert.ok(mapping.evidence?.length > 0, `${upstreamRule}: evidence is required`)
  assert.ok(
    mapping.treeSitter?.length > 0 || mapping.disposition,
    `${upstreamRule}: Tree-sitter mapping or disposition is required`,
  )
  for (const rule of mapping.treeSitter ?? []) {
    assert.ok(grammarRules.has(rule), `${upstreamRule}: Tree-sitter rule ${rule} is absent`)
  }
  for (const evidence of mapping.evidence) {
    assert.ok(fs.existsSync(path.join(root, evidence)), `${upstreamRule}: missing ${evidence}`)
  }
}

console.log(`upstream coverage: ${expectedRules.length} Quint.g4 rules mapped at ${expectedSha}`)
