import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')
const inventoryPath = path.join(root, 'test/upstream/quint-0.32.0/coverage.json')
const grammarPath = path.join(root, 'src/grammar.json')
const corpusDirectory = 'test/corpus'
const fixtureDirectory = 'test/fixtures/quint-0.32.0'
const expectedSha = 'fd772606588b40def9978d8c82da69c2db7a0e3b'
const expectedSourceSha256 = '4a7129cfd2e75f115a80cf4c1bb07273d7c3f2728b1f4421ec4112aace07bf36'
const expectedAlternativeCount = 197
const expectedReachableAlternativeCount = 196
const expectedUnreachableAlternativeCount = 1
const expectedAlternativeInventorySha256 = '433c37a208eecb8841f1319d965d60a920eac0b287af9b07a902d73646527620'
const expectedUnreachableAlternatives = [{
  rule: 'CAP_ID',
  index: 1,
  name: 'underscore-prefixed overlap',
  disposition: 'Upstream-unreachable: LOW_ID precedes CAP_ID with the same underscore-prefixed branch, so ANTLR assigns these tokens to LOW_ID.',
}]
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

function platformName() {
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'win32') return 'windows'
  return process.platform
}

function parseCorpusAttributes(testNameAndMarkers) {
  let name = ''
  let seenMarker = false
  let skip = false
  let platform = null
  for (const line of testNameAndMarkers.match(/[^\n]*\n/g) ?? []) {
    const trimmedLine = line.trim()
    const marker = trimmedLine.split('(')[0]
    if (marker === ':skip') {
      seenMarker = true
      skip = true
    } else if (marker === ':platform') {
      const match = trimmedLine.match(/^:platform\((.*)\)$/)
      if (match) {
        seenMarker = true
        platform = (platform ?? false) || match[1].trim() === platformName()
      }
    } else if (marker === ':language') {
      if (/^:language\((.*)\)$/.test(trimmedLine)) seenMarker = true
    } else if ([':fail-fast', ':error', ':cst'].includes(marker)) {
      seenMarker = true
    } else if (!seenMarker) {
      name += line
    }
  }
  return {
    executed: !skip && (platform ?? true),
    name: name.trimEnd(),
  }
}

function corpusEntriesFromContents(contents) {
  const headerRegex = /^(?<equals>={3,})(?<suffix1>[^=\r\n][^\r\n]*)?\r?\n(?<testNameAndMarkers>(?:(?:[^=\r\n]|\s+:)[^\r\n]*\r?\n)+)={3,}(?<suffix2>[^=\r\n][^\r\n]*)?\r?\n/gm
  const dividerRegex = /^(?<hyphens>-{3,})(?<suffix>[^-\r\n][^\r\n]*)?\r?\n/gm
  const headers = [...contents.matchAll(headerRegex)]
  const firstSuffix = headers[0]?.groups?.suffix1 ?? null
  const matchingHeaders = headers
    .filter(match => (match.groups.suffix1 ?? null) === firstSuffix && (match.groups.suffix2 ?? null) === firstSuffix)
    .map(match => ({
      attributes: parseCorpusAttributes(match.groups.testNameAndMarkers),
      end: match.index + match[0].length,
      start: match.index,
    }))

  const entries = []
  for (let index = 0; index < matchingHeaders.length; index += 1) {
    const header = matchingHeaders[index]
    const nextHeaderStart = matchingHeaders[index + 1]?.start ?? contents.length
    const body = contents.slice(header.end, nextHeaderStart)
    const dividers = [...body.matchAll(dividerRegex)]
      .filter(match => (match.groups.suffix ?? null) === firstSuffix)
    const divider = dividers.reduce(
      (longest, candidate) => !longest || candidate[0].length >= longest[0].length ? candidate : longest,
      null,
    )
    if (divider && header.attributes.executed && header.attributes.name.length > 0) {
      entries.push(header.attributes.name)
    }
  }
  return entries
}

function corpusEntries(corpusPath) {
  return corpusEntriesFromContents(fs.readFileSync(corpusPath, 'utf8'))
}

function assertCorpusEntryParserConformance() {
  assert.deepEqual(corpusEntriesFromContents(
    '===suffix\r\nmultiline\r\nname   \r\n:error\r\n=====suffix\r\ninput\r\n---suffix\r\n(source_file)\r\n',
  ), ['multiline\r\nname'])
  assert.deepEqual(corpusEntriesFromContents(
    '===\nduplicate\n===\ninput\n---\n(source_file)\n===\nduplicate   \n=====\ninput\n-----\n(source_file)\n',
  ), ['duplicate', 'duplicate'])
  assert.deepEqual(corpusEntriesFromContents(
    '===\nskipped\n:skip\n===\ninput\n---\n(source_file)\n===\nexecuted error\n:error\n===\ninput\n---\n(source_file)\n',
  ), ['executed error'])
  assert.deepEqual(corpusEntriesFromContents(
    '==\ntoo short\n==\ninput\n---\n(source_file)\n',
  ), [])
  assert.deepEqual(corpusEntriesFromContents(
    '===suffix\ndifferent suffix\n===other\ninput\n---suffix\n(source_file)\n',
  ), [])
  assert.deepEqual(corpusEntriesFromContents(
    '===\nmissing divider\n===\ninput\n(source_file)\n',
  ), [])
  assert.deepEqual(corpusEntriesFromContents(
    '===\npseudo heading\n===\ninput\n--\n(source_file)\n',
  ), [])
  assert.deepEqual(corpusEntriesFromContents('===\nmalformed without closing delimiter\n'), [])
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
    const matches = corpusEntries(corpusPath).filter(title => title === sectionTitle)
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

assertCorpusEntryParserConformance()

assert.equal(inventory.upstream.commit, expectedSha)
assert.equal(inventory.upstream.sourceSha256, expectedSourceSha256)
assert.deepEqual(Object.keys(inventory.rules).sort(), expectedRules.sort())

const alternativeCount = Object.values(inventory.rules)
  .reduce((count, mapping) => count + mapping.alternatives.length, 0)
assert.equal(alternativeCount, expectedAlternativeCount, 'reviewed alternative count changed')
const unreachableAlternatives = Object.entries(inventory.rules).flatMap(([rule, mapping]) =>
  mapping.alternatives.flatMap((alternative, index) =>
    alternative.upstreamReachability === 'unreachable'
      ? [{ rule, index, name: alternative.name, disposition: alternative.disposition }]
      : [],
  ),
)
assert.deepEqual(
  unreachableAlternatives,
  expectedUnreachableAlternatives,
  'reviewed upstream-unreachable alternative set changed',
)
assert.equal(
  alternativeCount - unreachableAlternatives.length,
  expectedReachableAlternativeCount,
  'reviewed reachable alternative count changed',
)
assert.equal(
  unreachableAlternatives.length,
  expectedUnreachableAlternativeCount,
  'reviewed upstream-unreachable alternative count changed',
)
const alternativeInventory = Object.fromEntries(
  Object.entries(inventory.rules)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([rule, mapping]) => [rule, mapping.alternatives.map(alternative => ({
      name: alternative.name,
      reachability: alternative.upstreamReachability ?? 'reachable',
      disposition: alternative.disposition ?? null,
    }))]),
)
assert.equal(
  crypto.createHash('sha256').update(JSON.stringify(alternativeInventory)).digest('hex'),
  expectedAlternativeInventorySha256,
  'reviewed alternative inventory, reachability, or disposition changed',
)

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
    if (Object.hasOwn(alternative, 'disposition')) {
      assert.equal(typeof alternative.disposition, 'string', `${context}: disposition must be a string`)
      assert.ok(alternative.disposition.trim().length > 0, `${context}: disposition must be non-empty`)
    }
    const unreachable = alternative.upstreamReachability === 'unreachable'
    if (unreachable) {
      assert.ok(!Object.hasOwn(alternative, 'evidence'), `${context}: unreachable alternatives cannot claim evidence`)
      assert.ok(alternative.disposition, `${context}: unreachable alternatives require a disposition`)
      continue
    }
    assert.ok(!Object.hasOwn(alternative, 'upstreamReachability'), `${context}: invalid upstream reachability`)
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

console.log(
  `upstream coverage: ${expectedRules.length} Quint.g4 rules and ${alternativeCount} alternatives mapped at ${expectedSha}`,
)
