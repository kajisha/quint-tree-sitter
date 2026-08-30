# Quint `.qnt` Grammar Conformance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `tree-sitter-quint` parse every ordinary `.qnt` source that Quint v0.32.0's phase-one `modules` parser accepts without producing an `ERROR` or missing node.

**Architecture:** Keep the existing CST where possible, add an immutable upstream-valid-source oracle, and resolve the `operDef expr` ambiguity with Tree-sitter conflicts and precedence rather than newline-sensitive scanning. Use focused corpus tests for exact CST behavior and a pinned 179-file upstream sweep for acceptance compatibility.

**Tech Stack:** JavaScript Tree-sitter grammar DSL, Tree-sitter CLI 0.26.13, generated C parser, Node.js 22, Node `tree-sitter` 0.25.0, Quint v0.32.0 phase-one parser as a manifest-generation oracle, GitHub Actions, Neovim 0.12 with `quint.nvim`.

**Spec:** `docs/superpowers/specs/2026-08-31-quint-grammar-conformance-design.md`

## Global Constraints

- The syntax baseline is Quint v0.32.0 commit `fd772606588b40def9978d8c82da69c2db7a0e3b` and `Quint.g4` SHA-256 `4a7129cfd2e75f115a80cf4c1bb07273d7c3f2728b1f4421ec4112aace07bf36`.
- Cover only the ordinary `.qnt` `modules` entry point; exclude REPL `declarationOrExpr`, semantic validation, and exact QNT diagnostics.
- Every source accepted by the official phase-one parser must parse without `ERROR` and without missing nodes.
- Preserve named CST nodes, fields, and highlight captures unless conformance cannot be achieved without a reviewed compatibility change.
- Keep normal local `npm test` offline; run the pinned 179-file source sweep as a separate release and hosted-CI gate.
- Do not add a project dependency on `@informalsystems/quint`; use it only as a transient manifest-generation oracle.
- Do not make newlines significant and do not extend the scanner to infer declaration boundaries.
- Use Tree-sitter CLI `0.26.13` and commit every reviewed generated artifact with its `grammar.js` change.
- Preserve upstream Apache-2.0 provenance for every copied fixture.
- Do not release, tag, push, or update `quint.nvim`'s published parser revision without a separate explicit request.

At execution start, create and retain one exact upstream checkout for all tasks:

```sh
export QUINT_UPSTREAM_CHECKOUT="$(mktemp -d)/quint-v0.32.0"
git clone --filter=blob:none --no-checkout https://github.com/quint-co/quint \
  "$QUINT_UPSTREAM_CHECKOUT"
git -C "$QUINT_UPSTREAM_CHECKOUT" checkout --detach \
  fd772606588b40def9978d8c82da69c2db7a0e3b
test "$(git -C "$QUINT_UPSTREAM_CHECKOUT" rev-parse HEAD)" = \
  fd772606588b40def9978d8c82da69c2db7a0e3b

oracle_bin="$(npm exec --yes --package=@informalsystems/quint@0.32.0 -- \
  sh -c 'command -v quint')"
export QUINT_ORACLE_ROOT="$(cd "$(dirname "$oracle_bin")/../@informalsystems/quint" && pwd)"
node -e "const p = require(process.env.QUINT_ORACLE_ROOT + '/package.json'); \
  if (p.version !== '0.32.0') process.exit(1)"
```

## Planned File Structure

- `grammar.js` — ambiguity fixes and, only if necessary, the direct `Quint.g4`-shaped fallback.
- `src/grammar.json`, `src/node-types.json`, `src/parser.c` — regenerated parser artifacts.
- `test/corpus/expressions.txt` — exact CST regressions for local declarations, calls, tuples, and body boundaries.
- `test/corpus/errors.txt` — locality checks for incomplete local declarations after grammar changes.
- `test/fixtures/quint-0.32.0/_1080tupleDestructuring.qnt` — immutable official success fixture.
- `test/fixtures/quint-0.32.0/_1090recordDestructuring.qnt` — immutable official success fixture.
- `test/fixtures/quint-0.32.0/PROVENANCE.md` — source URLs, commit, hashes, and official-test evidence for copied fixtures.
- `test/scripts/check-fixtures.mjs` — rejects both `ERROR` and missing nodes.
- `test/scripts/classify-upstream-sources.mjs` — maintenance-only phase-one oracle that emits a deterministic manifest.
- `test/scripts/check-upstream-sources.mjs` — parses every manifest-listed source from a pinned read-only checkout.
- `test/scripts/diagnose-upstream-sources.mjs` — reports the first bad node and source context for TDD clustering.
- `test/upstream/quint-0.32.0/valid-sources.json` — content-hashed classification of 184 upstream `.qnt` files: 179 valid and 5 invalid.
- `test/upstream/quint-0.32.0/coverage.json` — alternative-level concrete evidence rather than file-only evidence.
- `test/scripts/check-upstream-coverage.mjs` — validates alternative names and referenced corpus sections.
- `package.json` — offline and external conformance scripts.
- `.github/workflows/ci.yml` — pinned upstream checkout and external conformance job.
- `queries/highlights.scm`, `test/highlight/basic.qnt`, `test/node-types.test.js` — updated only for an intentional CST change.
- `README.md` — precise conformance claim, verification commands, and remaining non-goals.

---

### Task 1: Build the Immutable Upstream Syntax Oracle

**Files:**
- Create: `test/scripts/classify-upstream-sources.mjs`
- Create: `test/scripts/check-upstream-sources.mjs`
- Create: `test/scripts/diagnose-upstream-sources.mjs`
- Create: `test/upstream/quint-0.32.0/valid-sources.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: a Quint checkout at exact commit `fd772606588b40def9978d8c82da69c2db7a0e3b`.
- Consumes for maintenance only: absolute `@informalsystems/quint@0.32.0` package root containing `dist/src/parsing/quintParserFrontend.js` and `dist/src/idGenerator.js`.
- Produces: `npm run classify:upstream -- "$QUINT_UPSTREAM_CHECKOUT" "$QUINT_ORACLE_ROOT"` JSON on stdout.
- Produces: `npm run test:upstream-sources -- "$QUINT_UPSTREAM_CHECKOUT"` with exit zero only when all 179 valid sources have no bad Tree-sitter nodes.
- Produces: `npm run diagnose:upstream-sources -- "$QUINT_UPSTREAM_CHECKOUT"` with deterministic first-error context for each failure.

- [ ] **Step 1: Write the checker before changing the grammar**

Create `test/scripts/check-upstream-sources.mjs` around this real-parser behavior:

```js
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Parser from 'tree-sitter'
import Quint from '../../bindings/node/index.js'

const expectedCommit = 'fd772606588b40def9978d8c82da69c2db7a0e3b'
const [upstreamRoot] = process.argv.slice(2)
assert.ok(upstreamRoot, 'usage: check-upstream-sources.mjs <quint-checkout>')
assert.equal(
  execFileSync('git', ['-C', upstreamRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  expectedCommit,
)

const manifest = JSON.parse(fs.readFileSync(
  new URL('../upstream/quint-0.32.0/valid-sources.json', import.meta.url),
  'utf8',
))
assert.equal(manifest.version, '0.32.0')
assert.equal(manifest.commit, expectedCommit)
assert.equal(manifest.totalSources, 184)
assert.equal(manifest.validSources.length, 179)
assert.equal(manifest.invalidSources.length, 5)

const parser = new Parser()
parser.setLanguage(Quint)
const failures = []

function firstBad(node) {
  if (node.type === 'ERROR' || node.isMissing) return node
  for (const child of node.children) {
    const bad = firstBad(child)
    if (bad) return bad
  }
}

for (const entry of manifest.validSources) {
  const sourcePath = path.join(upstreamRoot, entry.path)
  const source = fs.readFileSync(sourcePath, 'utf8')
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), entry.sha256, entry.path)
  const tree = parser.parse(source)
  const bad = firstBad(tree.rootNode)
  if (bad) failures.push({
    path: entry.path,
    type: bad.type,
    row: bad.startPosition.row + 1,
    column: bad.startPosition.column + 1,
  })
}

assert.deepEqual(failures, [])
console.log(`upstream Quint ${manifest.version}: ${manifest.validSources.length} valid sources`)
```

- [ ] **Step 2: Write the deterministic classifier**

Create `test/scripts/classify-upstream-sources.mjs` with these requirements:

```js
const { parsePhase1fromText } = require(
  path.join(oracleRoot, 'dist/src/parsing/quintParserFrontend.js'),
)
const { newIdGenerator } = require(path.join(oracleRoot, 'dist/src/idGenerator.js'))
```

The script must:

1. verify upstream `HEAD`, oracle `package.json` version, and grammar SHA-256;
2. recursively sort all `.qnt` paths;
3. classify only `parsePhase1fromText(newIdGenerator(), source, path).errors.length === 0` as valid;
4. attach the SHA-256 of every source;
5. emit stable two-space-indented JSON with a final newline;
6. assert totals `184`, `179`, and `5`; and
7. restore `console.debug` after suppressing the oracle's recovery diagnostics.

Use this manifest shape:

```json
{
  "version": "0.32.0",
  "commit": "fd772606588b40def9978d8c82da69c2db7a0e3b",
  "grammarSha256": "4a7129cfd2e75f115a80cf4c1bb07273d7c3f2728b1f4421ec4112aace07bf36",
  "totalSources": 184,
  "validSources": [
    {
      "path": "quint/testFixture/SuperSpec.qnt",
      "sha256": "77f2411f4a7e430e79557ec4cefe67c1b0825444b5d030a96a575cd8fec6c8e2"
    }
  ],
  "invalidSources": [
    {
      "path": "quint/testFixture/modulesAndJunk.qnt",
      "sha256": "ca9688597cc99840d4b1e06d49bdb717314214930938b8ea5ea514f6cdbc897b"
    }
  ]
}
```

The displayed entries illustrate the exact entry shape; the generated file
must contain all 179 valid entries and all 5 invalid entries.

Generate the exact arrays from the oracle and add the stdout as
`test/upstream/quint-0.32.0/valid-sources.json` with `apply_patch`; do not hand-classify paths.

- [ ] **Step 3: Write the diagnostic companion**

Create `test/scripts/diagnose-upstream-sources.mjs` using the same manifest,
hash verification, parser, and `firstBad` traversal. For each bad valid source,
print one line in this literal format:

```text
quint/testFixture/_1080tupleDestructuring.qnt:60:23:MISSING:val (x2, y2) = t2 ⏎ (x1 + x2, y1 + y2) ⏎ }
```

Sort by path and exit nonzero when any failure exists. This is a diagnostic
command, not a source-text snapshot test.

- [ ] **Step 4: Add scripts without changing the offline default suite**

Add to `package.json`:

```json
"classify:upstream": "node test/scripts/classify-upstream-sources.mjs",
"test:upstream-sources": "node test/scripts/check-upstream-sources.mjs",
"diagnose:upstream-sources": "node test/scripts/diagnose-upstream-sources.mjs"
```

Do not append `test:upstream-sources` to `npm test`; it requires a separate
pinned checkout.

- [ ] **Step 5: Verify the new gate fails for the known compatibility gap**

Run under Node 22:

```sh
npm run test:upstream-sources -- "$QUINT_UPSTREAM_CHECKOUT"
```

Expected: FAIL with a non-empty failure array. Before grammar changes, the
oracle has 179 valid sources and `tree-sitter-quint` has 77 failing sources.

Run:

```sh
npm run diagnose:upstream-sources -- "$QUINT_UPSTREAM_CHECKOUT"
```

Expected: nonzero exit and deterministic lines including
`quint/testFixture/_1080tupleDestructuring.qnt` and
`examples/language-features/lists.qnt`.

- [ ] **Step 6: Verify foundation files and commit**

Run:

```sh
npm run test:coverage
npm run test:fixtures
git diff --check
```

Expected: existing offline gates pass; only the newly introduced external
conformance command remains intentionally red.

Commit:

```sh
git add package.json test/scripts/classify-upstream-sources.mjs \
  test/scripts/check-upstream-sources.mjs \
  test/scripts/diagnose-upstream-sources.mjs \
  test/upstream/quint-0.32.0/valid-sources.json
git commit -m "test: add pinned Quint source conformance gate"
```

---

### Task 2: Lock the Known Let-In Ambiguities with Failing Tests

**Files:**
- Modify: `test/corpus/expressions.txt`
- Modify: `test/corpus/errors.txt`
- Create: `test/fixtures/quint-0.32.0/_1080tupleDestructuring.qnt`
- Create: `test/fixtures/quint-0.32.0/_1090recordDestructuring.qnt`
- Modify: `test/fixtures/quint-0.32.0/PROVENANCE.md`
- Modify: `test/scripts/check-fixtures.mjs`

**Interfaces:**
- Produces: exact CST expectations for a local dot-call RHS and a following tuple body.
- Produces: official fixture acceptance that fails on the v0.1.0 parser.
- Preserves: local recovery of later declaration siblings.

- [ ] **Step 1: Add the dot-call local declaration regression**

Append a corpus case to `test/corpus/expressions.txt` whose source contains:

```quint
module M {
  action step = {
    nondet message = messages.filter(enabled).oneOf()
    all { enabled(message), deliver(message) }
  }
}
```

The expected CST must assert:

- the declaration body is one nested `ufcs_expression` ending in an empty
  `argument_list`;
- the let-in body is an `action_block`; and
- no `unit_expression`, `ERROR`, or missing node appears between them.

Name the corpus section `local declaration preserves complete dot call rhs`.

- [ ] **Step 2: Add the tuple-body regression**

Append a second corpus case:

```quint
module M {
  def combine(t1, t2) = {
    val (x1, y1) = t1
    val (x2, y2) = t2
    (x1 + x2, y1 + y2)
  }
}
```

The expected CST must assert two nested `declaration_expression` nodes. The
second declaration body must be the identifier `t2`, while the outer body must
be `tuple_expression`, not `call_expression`. Name it
`local destructuring leaves tuple body outside rhs`.

- [ ] **Step 3: Preserve incomplete-input recovery**

Append an `errors.txt` case where the first local declaration is malformed and
a later top-level declaration remains a sibling:

```quint
module M {
  def broken = {
    val (x, y) = pair
  }
  val later = 1
}
```

Assert a local missing/body error under `broken` and a complete
`operator_definition` for `later`.

- [ ] **Step 4: Copy official success fixtures with immutable provenance**

Copy exact contents from:

- `quint/testFixture/_1080tupleDestructuring.qnt`
- `quint/testFixture/_1090recordDestructuring.qnt`

at commit `fd772606588b40def9978d8c82da69c2db7a0e3b`. Record raw and GitHub URLs,
Git blob IDs, byte sizes, local names, the upstream parser-test references, and
Apache-2.0 attribution in `PROVENANCE.md`. Verify copied blob IDs with:

```sh
git -C "$QUINT_UPSTREAM_CHECKOUT" hash-object \
  quint/testFixture/_1080tupleDestructuring.qnt \
  quint/testFixture/_1090recordDestructuring.qnt
```

- [ ] **Step 5: Make fixture checking reject missing nodes explicitly**

Add a real-tree traversal to `check-fixtures.mjs`:

```js
function firstBad(node) {
  if (node.type === 'ERROR' || node.isMissing) return node
  for (const child of node.children) {
    const bad = firstBad(child)
    if (bad) return bad
  }
}
```

Replace the `rootNode.hasError`-only branch with `const bad = firstBad(...)`
and include `bad.type`, row, column, and the root S-expression in the failure.

- [ ] **Step 6: Run the focused tests and verify RED**

Run:

```sh
npm run test:corpus
npm run test:fixtures
```

Expected: FAIL for the two new ambiguity cases and the official tuple
destructuring fixture. Confirm the failures show the existing wrong split:
`field_access_expression` plus `unit_expression`, or `t2(...)` plus a missing
let-in body.

Do not commit this task separately; keep the verified failing tests for Task 3's
red-green commit.

---

### Task 3: Resolve Local Declaration Boundaries Without Newline Semantics

**Files:**
- Modify: `grammar.js`
- Generate: `src/grammar.json`
- Generate: `src/node-types.json`
- Generate: `src/parser.c`
- Generate if changed: `src/scanner.c`
- Test: files left red by Task 2

**Interfaces:**
- Consumes: Task 2's exact CST and fixture failures.
- Produces: a `declaration_expression` whose declaration RHS and required body remain distinct under Tree-sitter GLR parsing.
- Preserves: existing public `operator_definition`, `declaration_expression`, call, UFCS, tuple, and field names.

- [ ] **Step 1: Preserve competing parses explicitly**

Start with the compatibility-preserving conflict set:

```js
conflicts: $ => [
  // existing conflicts
  [$.declaration_expression, $.call_expression],
  [$.declaration_expression, $.ufcs_expression],
  [$.declaration_expression, $.field_access_expression],
  [$.declaration_expression, $.tuple_expression],
  [$.declaration_expression, $.parenthesized_expression],
],
```

Regenerate. Remove only conflict entries that Tree-sitter proves unreachable;
do not replace them with newline-sensitive tokens.

- [ ] **Step 2: Prefer a complete let-in parse over greedy postfix absorption**

Wrap the full let-in rule, not individual identifier tokens, in positive dynamic
precedence:

```js
declaration_expression: $ => prec.dynamic(1, prec.right(PREC.BLOCK, seq(
  field('declaration', alias($._local_operator_definition, $.operator_definition)),
  field('body', choice($.declaration_expression, $._expression)),
))),
```

If the tuple case remains greedy, apply negative dynamic precedence to the
ambiguous postfix rule as a whole while keeping its existing static precedence:

```js
call_expression: $ => prec.dynamic(-1, prec(PREC.POSTFIX, seq(
  field('function', $._call_name),
  field('arguments', $.argument_list),
))),
```

If the empty dot-call case remains split, give a complete UFCS node positive
dynamic precedence relative to field access. Dynamic precedence must affect
only GLR ambiguities; ordinary call precedence remains `PREC.POSTFIX`.

- [ ] **Step 3: Run RED tests after each minimal grammar change**

Run after each change:

```sh
npm run generate
npm run test:corpus
npm run test:fixtures
```

Expected final result for this step: both Task 2 corpus cases and both official
destructuring fixtures pass. Existing precedence and error-recovery corpus cases
must remain green.

- [ ] **Step 4: Measure the effect on the upstream gap set**

Run:

```sh
npm run diagnose:upstream-sources -- "$QUINT_UPSTREAM_CHECKOUT"
```

Expected: fewer than the baseline 77 failures. Save the sorted remaining output
in the task report, not in production source.

- [ ] **Step 5: Verify generated and public CST compatibility**

Run:

```sh
npm run test:node-types
npm run test:highlight
npm run check:generated
git diff --check
```

If existing named nodes or field cardinalities changed, stop and apply Task 4's
fallback review before updating queries. Do not silently rewrite snapshots.

- [ ] **Step 6: Commit the red-green fix**

Commit Task 2 and Task 3 together:

```sh
git add grammar.js src/grammar.json src/node-types.json src/parser.c src/scanner.c \
  test/corpus/expressions.txt test/corpus/errors.txt \
  test/fixtures/quint-0.32.0/_1080tupleDestructuring.qnt \
  test/fixtures/quint-0.32.0/_1090recordDestructuring.qnt \
  test/fixtures/quint-0.32.0/PROVENANCE.md \
  test/scripts/check-fixtures.mjs
git commit -m "fix: parse Quint local declaration bodies"
```

---

### Task 4: Close Every Remaining Official Valid-Source Gap

**Files:**
- Modify: `test/corpus/expressions.txt`
- Modify as evidence requires: other `test/corpus/*.txt`
- Modify: `grammar.js`
- Generate: `src/grammar.json`
- Generate: `src/node-types.json`
- Generate: `src/parser.c`
- Modify only on reviewed CST change: `queries/highlights.scm`, `test/highlight/basic.qnt`, `test/node-types.test.js`

**Interfaces:**
- Consumes: deterministic diagnostic output from Task 1 after Task 3.
- Produces: an empty upstream failure list across all 179 officially valid files.
- Preserves: syntax-insensitive whitespace and local recovery.

- [ ] **Step 1: Cluster by first observable grammar failure**

Run the diagnostic command and group lines by the smallest syntax shape that
reproduces the first bad node. Use these already observed classes as the initial
partition:

1. local declaration RHS ending in empty or non-empty dot call;
2. local destructuring followed by tuple or parenthesized body;
3. nested local declarations followed by `if`, `match`, logical/action block,
   record, or chained dot body;
4. dot-call chains split into field access and a following argument list;
5. keyword-as-identifier declarations and record fields; and
6. any distinct lexical, type, import, pattern, or precedence failure not
   reducible to the first five classes.

- [ ] **Step 2: Minimize one real valid source per remaining class**

For each non-empty class, delete unrelated modules and declarations while
rerunning both parsers until the smallest source still has:

- zero official phase-one errors, and
- the same first Tree-sitter bad-node shape.

Add that literal source and a hand-derived CST to the relevant corpus file.
Name the corpus section after the behavior, not the upstream filename. State in
the commit report which upstream path and line produced it.

- [ ] **Step 3: Verify RED for each new corpus case**

Run the new case with:

```sh
npm run test:corpus
```

Expected: FAIL because the current grammar produces the diagnosed bad split.
If it passes, the minimization removed the behavior; restore source structure
until the focused case fails for the expected reason.

- [ ] **Step 4: Apply the smallest grammar correction per class**

Prefer, in order:

1. a declared GLR conflict between real competing rules;
2. dynamic precedence on the complete competing node;
3. factoring a shared postfix or let-in rule without renaming public nodes; and
4. the spec's direct `Quint.g4`-shaped expression redesign.

Reject any correction that checks line breaks, changes lexical whitespace, or
merely suppresses `hasError` without producing the intended CST.

After each class, run its focused case, the complete corpus, fixtures, and the
upstream sweep. Continue until:

```text
upstream Quint 0.32.0: 179 valid sources
```

and exit status is zero.

- [ ] **Step 5: Exercise formatting invariance**

For every new local-declaration corpus source, add or retain both multiline and
single-line layout variants that must produce the same named CST shape. Run:

```sh
npm run test:corpus
```

Expected: both layouts pass without scanner changes.

- [ ] **Step 6: Apply the direct-grammar fallback only if required**

If conflict and precedence work cannot reach zero upstream failures, replace
the internal expression/local-definition factoring while preserving aliases to
the existing public node names. Before accepting fallback output:

```sh
npm run test:node-types
npm run test:highlight
npm run test:node
```

Review every generated `src/node-types.json` difference. Update queries and
consumer tests only for differences necessary to parse valid official syntax.
Document each intentional public change in README.

- [ ] **Step 7: Commit each independently green syntax class**

For each class, stage its corpus, grammar, generated artifacts, and required
query/node-type changes only. Use a specific message such as:

```sh
git commit -m "fix: preserve Quint dot calls in let-in expressions"
```

Do not combine unrelated syntax classes or documentation changes in these
commits.

---

### Task 5: Make Every Official Grammar Alternative Point to Executable Evidence

**Files:**
- Modify: `test/upstream/quint-0.32.0/coverage.json`
- Modify: `test/scripts/check-upstream-coverage.mjs`

**Interfaces:**
- Consumes: stable corpus section titles and immutable fixture names from Tasks 2–4.
- Produces: one or more concrete evidence references for every listed `Quint.g4` alternative.

- [ ] **Step 1: Change the inventory schema at one representative rule**

Change an entry from string alternatives plus shared evidence:

```json
"lambda": {
  "alternatives": ["unsugared", "tuple sugar"],
  "treeSitter": ["lambda_expression", "tuple_parameter"],
  "evidence": ["test/corpus/expressions.txt"]
}
```

to alternative-local evidence:

```json
"lambda": {
  "alternatives": [
    {
      "name": "unsugared",
      "evidence": ["test/corpus/expressions.txt#expressions conditionals and lambdas"]
    },
    {
      "name": "tuple sugar",
      "evidence": ["test/corpus/expressions.txt#expressions lambda parameter forms and tuple continuation"]
    }
  ],
  "treeSitter": ["lambda_expression", "tuple_parameter"]
}
```

- [ ] **Step 2: Write the failing schema validation**

Update the checker to require every alternative to have a non-empty `name` and
`evidence` array. Parse each evidence reference as `<path>#<corpus-section>` or
as an immutable fixture path. For corpus references, assert the exact section
heading exists between Tree-sitter corpus separators. For fixture references,
assert the file exists under the pinned fixture directory.

Run:

```sh
npm run test:coverage
```

Expected: FAIL on the remaining legacy string alternatives.

- [ ] **Step 3: Migrate all 86 upstream rules**

Convert every `alternatives` array. Preserve `treeSitter` and `disposition`
semantics, but move broad shared evidence onto each actual alternative.
Anonymous tokens may cite the corpus case that executes them. Parser-action
diagnostics may cite an error corpus and retain their disposition.

No alternative may cite only a file path when that file is a multi-case corpus;
include its exact section title.

- [ ] **Step 4: Verify coverage evidence and commit**

Run:

```sh
npm run test:coverage
npm run test:corpus
npm run test:fixtures
git diff --check
```

Expected: all pass and the checker still reports 86 mapped `Quint.g4` rules.

Commit:

```sh
git add test/upstream/quint-0.32.0/coverage.json \
  test/scripts/check-upstream-coverage.mjs
git commit -m "test: bind Quint grammar alternatives to corpus evidence"
```

---

### Task 6: Add the Hosted Conformance Gate and Document the Claim

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify only if captures changed: sibling repository `quint.nvim/tests/integration.lua`

**Interfaces:**
- Consumes: green offline suite and green pinned upstream sweep.
- Produces: hosted CI proof against the immutable official source set.
- Produces: a precise user-facing compatibility statement without claiming semantic or invalid-input equivalence.

- [ ] **Step 1: Add a read-only pinned checkout step**

After `npm ci`, clone official Quint into runner temporary storage and detach at
the exact commit without executing any upstream scripts:

```yaml
- name: Fetch pinned Quint syntax fixtures
  run: |
    git clone --filter=blob:none --no-checkout https://github.com/quint-co/quint \
      "$RUNNER_TEMP/quint-upstream"
    git -C "$RUNNER_TEMP/quint-upstream" checkout --detach \
      fd772606588b40def9978d8c82da69c2db7a0e3b
    test "$(git -C "$RUNNER_TEMP/quint-upstream" rev-parse HEAD)" = \
      fd772606588b40def9978d8c82da69c2db7a0e3b
- name: Check all officially valid Quint sources
  run: npm run test:upstream-sources -- "$RUNNER_TEMP/quint-upstream"
```

Keep `permissions: contents: read`; do not persist credentials or execute
upstream package scripts.

- [ ] **Step 2: Update README compatibility language**

Document exactly:

- the 0.32.0 `modules` entry-point scope;
- the immutable commit and grammar hash;
- 179 official phase-one-valid sources from 184 `.qnt` files;
- absence of `ERROR` and missing nodes as the acceptance criterion;
- separate offline and external verification commands;
- intentional Tree-sitter recovery differences; and
- exclusion of REPL syntax, QNT diagnostic parity, and semantics.

Do not use “all Quint programs” without the ordinary `.qnt`, version, and syntax-only qualifiers.

- [ ] **Step 3: Verify Neovim against the local parser revision**

In the sibling `quint.nvim` repository, use its existing integration test but
override registration in the headless process after deleting the registration
autocmd group:

```lua
pcall(vim.api.nvim_del_augroup_by_name, 'quint-nvim-parser')
local parser = require('nvim-treesitter.parsers').quint
parser.install_info.url = assert(vim.env.QUINT_PARSER_REPO)
parser.install_info.revision = assert(vim.env.QUINT_PARSER_REV)
```

Run with isolated XDG directories, `QUINT_PARSER_REPO` set to this repository,
and `QUINT_PARSER_REV` set to the implementation commit SHA. The integration
fixture must parse without root error and retain all existing captures.

Use this exact local command after ensuring the sibling repository has its
`.deps/nvim-treesitter` checkout:

```sh
export QUINT_NVIM_REPO=/absolute/path/to/quint.nvim
export QUINT_PARSER_REPO="$(pwd)"
export QUINT_PARSER_REV="$(git rev-parse HEAD)"
export NVIM_TREESITTER_DIR="$QUINT_NVIM_REPO/.deps/nvim-treesitter"
export XDG_DATA_HOME="$(mktemp -d)"
export XDG_STATE_HOME="$(mktemp -d)"
export XDG_CACHE_HOME="$(mktemp -d)"
mkdir -p "$XDG_DATA_HOME/nvim/site"

cd "$QUINT_NVIM_REPO"
nvim --headless -u tests/minimal_init.lua \
  -c "lua pcall(vim.api.nvim_del_augroup_by_name, 'quint-nvim-parser'); \
    local p = require('nvim-treesitter.parsers').quint; \
    p.install_info.url = vim.env.QUINT_PARSER_REPO; \
    p.install_info.revision = vim.env.QUINT_PARSER_REV" \
  -l tests/integration.lua
```

If capture names and positions are unchanged, do not commit anything to
`quint.nvim`. If they changed because of a necessary public CST change, add a
failing integration assertion first, update only the affected query/test, and
report that a coordinated plugin release will be required.

- [ ] **Step 4: Run the two verification lanes**

Under Node 22:

```sh
npm test
npm run test:upstream-sources -- "$QUINT_UPSTREAM_CHECKOUT"
```

Expected: both exit zero; the external command prints exactly 179 valid sources.

- [ ] **Step 5: Commit CI and documentation**

```sh
git add .github/workflows/ci.yml README.md
git commit -m "ci: verify all valid Quint 0.32 sources"
```

Do not push until the complete branch review passes and the user explicitly
requests publication.

---

### Task 7: Final Verification and Compatibility Review

**Files:**
- Review: every file changed since plan execution began.
- Create outside tracked source: a task report recording commands, exit codes, baseline/final upstream counts, CST changes, and remaining limitations.

**Interfaces:**
- Consumes: all implementation commits.
- Produces: evidence sufficient to claim ordinary `.qnt` syntax conformance for Quint v0.32.0.

- [ ] **Step 1: Run the full Node 22 release suite from a clean dependency install**

```sh
npm ci
npm test
```

Expected: corpus, highlight, node types, Node binding, TypeScript, fixtures,
coverage, generated artifacts, and offline package installation all pass.

- [ ] **Step 2: Run the immutable upstream sweep**

```sh
npm run test:upstream-sources -- "$QUINT_UPSTREAM_CHECKOUT"
```

Expected output:

```text
upstream Quint 0.32.0: 179 valid sources
```

- [ ] **Step 3: Confirm the baseline counterexamples explicitly**

Parse the exact official `_1080tupleDestructuring.qnt`,
`examples/language-features/lists.qnt`, and
`examples/classic/distributed/Paxos/Paxos.qnt` through the Node binding. Assert
no `ERROR` or missing node and record the root node type and parse duration.

- [ ] **Step 4: Run Neovim integration through local parser override**

Run the Task 6 isolated `quint.nvim` integration. Expected: `source_file` root,
no root error, and every existing highlight capture found.

- [ ] **Step 5: Inspect scope, generated output, and repository state**

```sh
git diff --check
git status --short
git log --oneline --decorate origin/main..HEAD
```

Confirm:

- no upstream checkout, npm cache, temporary manifest, or task report is tracked;
- no dependency on `@informalsystems/quint` was added;
- generated files match `grammar.js`;
- only reviewed conformance, test, CI, query, and documentation files changed;
- no release tag or push occurred; and
- every intentional CST change is documented.

- [ ] **Step 6: Request independent code and completion review**

Have a reviewer inspect grammar correctness, test adequacy, CI trust boundary,
CST compatibility, and the claim wording. Address Critical and Important
findings with new failing tests before final verification.

- [ ] **Step 7: Re-run affected gates after review fixes**

At minimum rerun:

```sh
npm test
npm run test:upstream-sources -- "$QUINT_UPSTREAM_CHECKOUT"
git diff --check
```

Only after fresh zero-exit evidence may the branch be reported complete. Do not
tag, release, push, or update `quint.nvim`'s published revision without explicit
user direction.
