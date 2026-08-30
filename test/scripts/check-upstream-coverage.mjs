import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const inventoryPath = path.join(root, 'test/upstream/quint-0.32.0/coverage.json')
const grammarPath = path.join(root, 'src/grammar.json')
const corpusDirectory = 'test/corpus'
const fixtureDirectory = 'test/fixtures/quint-0.32.0'
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

function resolveRepositoryPath(reference, context) {
  assert.ok(!path.isAbsolute(reference), `${context}: absolute evidence paths are forbidden`)
  assert.equal(reference, reference.replaceAll('\\', '/'), `${context}: evidence paths must use forward slashes`)
  const normalized = path.posix.normalize(reference)
  assert.equal(normalized, reference, `${context}: evidence path traversal or ambiguity is forbidden: ${reference}`)
  assert.ok(!normalized.startsWith('../'), `${context}: evidence path escapes the repository: ${reference}`)
  return path.join(root, normalized)
}

function assertInsideDirectory(candidatePath, directory, context) {
  const realDirectory = fs.realpathSync(path.join(root, directory))
  const realCandidate = fs.realpathSync(candidatePath)
  assert.ok(
    realCandidate.startsWith(`${realDirectory}${path.sep}`),
    `${context}: evidence resolves outside ${directory}`,
  )
}

function corpusSectionTitles(corpusPath) {
  const contents = fs.readFileSync(corpusPath, 'utf8')
  const lines = contents.split(/\r?\n/)
  const titles = []
  for (let index = 0; index < lines.length - 2; index += 1) {
    if (!/^={10,}$/.test(lines[index])) continue
    if (lines[index + 2] !== lines[index]) continue
    titles.push(lines[index + 1])
  }
  return titles
}

function validateEvidence(reference, context) {
  assert.equal(typeof reference, 'string', `${context}: evidence references must be strings`)
  assert.ok(reference.length > 0, `${context}: evidence references must be non-empty`)

  const hashIndex = reference.indexOf('#')
  if (hashIndex !== -1) {
    assert.equal(hashIndex, reference.lastIndexOf('#'), `${context}: ambiguous corpus reference ${reference}`)
    const corpusReference = reference.slice(0, hashIndex)
    const sectionTitle = reference.slice(hashIndex + 1)
    assert.ok(sectionTitle.length > 0, `${context}: corpus section title is required`)
    assert.ok(
      corpusReference.startsWith(`${corpusDirectory}/`) && corpusReference.endsWith('.txt'),
      `${context}: corpus evidence must be a .txt file under ${corpusDirectory}`,
    )
    const corpusPath = resolveRepositoryPath(corpusReference, context)
    assert.ok(fs.existsSync(corpusPath), `${context}: missing ${corpusReference}`)
    assert.ok(fs.statSync(corpusPath).isFile(), `${context}: corpus evidence must name a file: ${corpusReference}`)
    assertInsideDirectory(corpusPath, corpusDirectory, context)
    const matches = corpusSectionTitles(corpusPath).filter(title => title === sectionTitle)
    assert.equal(matches.length, 1, `${context}: corpus section must exist exactly once: ${reference}`)
    return
  }

  assert.ok(
    reference.startsWith(`${fixtureDirectory}/`) && reference.endsWith('.qnt'),
    `${context}: fixture evidence must be a .qnt file under ${fixtureDirectory}`,
  )
  const fixturePath = resolveRepositoryPath(reference, context)
  assert.ok(fs.existsSync(fixturePath), `${context}: missing ${reference}`)
  assert.ok(fs.statSync(fixturePath).isFile(), `${context}: fixture evidence must name a file: ${reference}`)
  assertInsideDirectory(fixturePath, fixtureDirectory, context)
}

assert.equal(inventory.upstream.commit, expectedSha)
assert.equal(inventory.upstream.sourceSha256, expectedSourceSha256)
assert.deepEqual(Object.keys(inventory.rules).sort(), expectedRules.sort())

for (const [upstreamRule, mapping] of Object.entries(inventory.rules)) {
  assert.ok(mapping.alternatives?.length > 0, `${upstreamRule}: alternatives are required`)
  assert.ok(!Object.hasOwn(mapping, 'evidence'), `${upstreamRule}: evidence must be alternative-local`)
  assert.ok(
    mapping.treeSitter?.length > 0 || mapping.disposition,
    `${upstreamRule}: Tree-sitter mapping or disposition is required`,
  )
  for (const rule of mapping.treeSitter ?? []) {
    assert.ok(grammarRules.has(rule), `${upstreamRule}: Tree-sitter rule ${rule} is absent`)
  }
  for (const [alternativeIndex, alternative] of mapping.alternatives.entries()) {
    const context = `${upstreamRule}.alternatives[${alternativeIndex}]`
    assert.equal(typeof alternative, 'object', `${context}: alternative must be an object`)
    assert.ok(alternative !== null && !Array.isArray(alternative), `${context}: alternative must be an object`)
    assert.equal(typeof alternative.name, 'string', `${context}: name must be a string`)
    assert.ok(alternative.name.trim().length > 0, `${context}: name is required`)
    assert.ok(Array.isArray(alternative.evidence), `${context}: evidence must be an array`)
    assert.ok(alternative.evidence.length > 0, `${context}: evidence is required`)
    assert.equal(
      new Set(alternative.evidence).size,
      alternative.evidence.length,
      `${context}: duplicate evidence references are ambiguous`,
    )
    for (const evidence of alternative.evidence) validateEvidence(evidence, context)
  }
  assert.equal(
    new Set(mapping.alternatives.map(alternative => alternative.name)).size,
    mapping.alternatives.length,
    `${upstreamRule}: alternative names must be unique`,
  )
}

const alternativeCount = Object.values(inventory.rules)
  .reduce((count, mapping) => count + mapping.alternatives.length, 0)
console.log(
  `upstream coverage: ${expectedRules.length} Quint.g4 rules and ${alternativeCount} alternatives mapped at ${expectedSha}`,
)
