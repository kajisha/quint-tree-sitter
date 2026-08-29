# Tree-sitter Quint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a Tree-sitter grammar, generated C parser, highlighting queries, and Node/npm binding for the complete Quint 0.32.0 syntax.

**Architecture:** Translate the version-pinned Quint ANTLR grammar into a hand-maintained Tree-sitter grammar whose public CST is fixed by corpus tests. Keep semantic processing in Quint, commit reproducible generated parser artifacts, and validate compatibility against provenance-recorded Quint fixtures plus Node and highlight tests.

**Tech Stack:** JavaScript grammar DSL, Tree-sitter CLI 0.26.13, generated C parser, Node.js 22, `node-addon-api`, `node-gyp-build`, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-29-tree-sitter-quint-design.md`

## Global Constraints

- Support Quint language version `0.32.0` and record an immutable upstream tag or commit SHA.
- Use Tree-sitter CLI `0.26.13`; commit `src/parser.c`, `src/grammar.json`, and `src/node-types.json`.
- Use internal language name `quint`, scope `source.quint`, and file extension `.qnt`.
- Initial distribution targets are the generated C parser and Node/npm package only.
- Implement syntax and error recovery only; do not implement resolution, type checking, effect checking, or other Quint semantics.
- Do not add an external scanner unless a focused failing corpus test proves it is required.
- Treat visible node names and `field()` names as a downstream compatibility contract.
- Do not redistribute upstream fixtures until their license and provenance have been recorded.

## Planned File Structure

- `grammar.js` — complete lexical and syntactic Tree-sitter grammar.
- `tree-sitter.json` — grammar metadata, file types, scope, query paths, and binding selection.
- `package.json`, `package-lock.json` — pinned development CLI, Node build dependencies, scripts, and npm contents.
- `binding.gyp` — native Node addon build definition.
- `bindings/node/binding.cc` — N-API bridge to `tree_sitter_quint`.
- `bindings/node/index.js` — loads the native addon and attaches `node-types.json`.
- `bindings/node/index.d.ts` — Node binding type declaration.
- `bindings/node/binding_test.js` — Node load and representative-parse tests.
- `src/parser.c`, `src/grammar.json`, `src/node-types.json`, `src/tree_sitter/parser.h` — generated parser artifacts.
- `test/corpus/lexical.txt` — identifiers, literals, comments, and hashbang.
- `test/corpus/modules_and_declarations.txt` — modules and basic declarations.
- `test/corpus/imports_and_instances.txt` — import, export, and instance syntax.
- `test/corpus/types.txt` — all Quint type forms.
- `test/corpus/expressions.txt` — primary, collection, call, access, conditional, and block expressions.
- `test/corpus/precedence.txt` — operator precedence and associativity.
- `test/corpus/patterns_and_match.txt` — destructuring and match syntax.
- `test/corpus/errors.txt` — explicit recovery expectations for incomplete input.
- `test/fixtures/quint-0.32.0/PROVENANCE.md` — source URLs, immutable references, license decision, and fixture inventory.
- `test/fixtures/quint-0.32.0/*.qnt` — legally reusable pinned fixtures or original equivalents.
- `test/scripts/check-fixtures.mjs` — asserts valid fixtures contain no `ERROR` or missing nodes.
- `test/highlight/basic.qnt` — annotated highlight expectations.
- `queries/highlights.scm` — CST-based highlight captures.
- `.github/workflows/ci.yml` — generation, corpus, highlight, fixture, native binding, and clean-tree checks.
- `README.md` — compatibility, installation, use, CST scope, development, and upstream-update policy.
- `LICENSE` — project license selected before publication.

---

### Task 1: Bootstrap a Reproducible Grammar Repository

**Files:**
- Create: `package.json`
- Create: `tree-sitter.json`
- Create: `grammar.js`
- Create: `test/corpus/modules_and_declarations.txt`
- Generate: `package-lock.json`
- Generate: `src/parser.c`
- Generate: `src/grammar.json`
- Generate: `src/node-types.json`
- Generate: `src/tree_sitter/parser.h`

**Interfaces:**
- Produces: Tree-sitter language `quint`; root node `source_file`; public node `module` with `name` and `body` fields.
- Produces: npm scripts `generate`, `test:corpus`, `test`, and `check:generated` used by every later task.

- [ ] **Step 1: Create package metadata with pinned tools**

Create `package.json` with this initial contract:

```json
{
  "name": "tree-sitter-quint",
  "version": "0.1.0",
  "description": "Quint grammar for Tree-sitter",
  "license": "Apache-2.0",
  "main": "bindings/node",
  "types": "bindings/node/index.d.ts",
  "files": ["grammar.js", "tree-sitter.json", "bindings/node", "queries", "src"],
  "scripts": {
    "generate": "tree-sitter generate",
    "test:corpus": "tree-sitter test",
    "test": "npm run test:corpus",
    "check:generated": "npm run generate && git diff --exit-code -- src"
  },
  "devDependencies": {
    "tree-sitter-cli": "0.26.13"
  },
  "tree-sitter": [{ "scope": "source.quint", "file-types": ["qnt"] }]
}
```

Before committing, confirm `Apache-2.0` matches the repository owner's intended publication license; changing the license after third-party contributions is harder to reverse.

- [ ] **Step 2: Write the first failing corpus test**

Create `test/corpus/modules_and_declarations.txt`:

```text
==================
empty module
==================

module Example {}

---

(source_file
  (module
    name: (identifier)))
```

- [ ] **Step 3: Run the corpus test and verify the grammar is absent**

Run: `npm install && npm run test:corpus`

Expected: FAIL because `grammar.js` and generated parser artifacts do not exist.

- [ ] **Step 4: Implement the minimal grammar and metadata**

Create `grammar.js`:

```js
module.exports = grammar({
  name: 'quint',

  extras: $ => [/\s/, $.comment],

  word: $ => $.identifier,

  rules: {
    source_file: $ => repeat($.module),
    module: $ => seq(
      'module',
      field('name', $.identifier),
      '{',
      field('body', repeat($.comment)),
      '}',
    ),
    identifier: _ => /[A-Za-z_][A-Za-z0-9_]*/,
    comment: _ => token(choice(seq('//', /.*/), seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'))),
  },
})
```

Create `tree-sitter.json`:

```json
{
  "grammars": [{
    "name": "quint",
    "camelcase": "Quint",
    "scope": "source.quint",
    "path": ".",
    "file-types": ["qnt"],
    "highlights": "queries/highlights.scm"
  }],
  "metadata": {
    "version": "0.1.0",
    "license": "Apache-2.0",
    "description": "Quint grammar for Tree-sitter",
    "authors": [{ "name": "kajisha" }]
  },
  "bindings": { "c": true, "node": true }
}
```

- [ ] **Step 5: Generate and run the first test**

Run: `npm run generate && npm run test:corpus`

Expected: PASS for `empty module`; generated files appear under `src/`.

- [ ] **Step 6: Verify reproducibility and commit**

Run: `npm run check:generated && git diff --check`

Expected: both commands exit 0.

Commit:

```bash
git add package.json package-lock.json tree-sitter.json grammar.js src test/corpus/modules_and_declarations.txt
git commit -m "chore: bootstrap tree-sitter Quint grammar"
```

---

### Task 2: Implement Quint Lexical Syntax

**Files:**
- Modify: `grammar.js`
- Create: `test/corpus/lexical.txt`
- Regenerate: `src/parser.c`
- Regenerate: `src/grammar.json`
- Regenerate: `src/node-types.json`

**Interfaces:**
- Produces: `identifier`, `type_identifier`, `integer`, `string`, `boolean`, `comment`, and `hash_bang_line` nodes/tokens.
- Produces: a temporary minimal `val name = literal` form of `operator_definition`, expanded to the complete upstream rule in Task 3.
- Consumes: `source_file` and `module` from Task 1.

- [ ] **Step 1: Add failing lexical corpus cases**

Cover all of these exact inputs in `test/corpus/lexical.txt`, each with an asserted CST:

```quint
#! /usr/bin/env quint run
module Lexical {
  const lower_name: int
  const UpperName: int
  val decimal = 1_000_000
  val hexadecimal = 0xCA_FE
  val text = "Quint"
  val truth = true
  /// documentation
  // line
  /* block */
}
```

Expected named leaf nodes must distinguish identifiers, integer/string/boolean literals, all three comment forms, and the source-leading hashbang. Add negative cases proving a hashbang is not accepted in the middle of a module and unterminated strings produce an `ERROR`.

- [ ] **Step 2: Run the focused tests**

Run: `npm run generate && npx tree-sitter test --filter "lexical"`

Expected: FAIL because lexical nodes and declarations are not implemented.

- [ ] **Step 3: Implement named lexical rules**

Add named rules rather than embedding literal regexes throughout the grammar:

```js
identifier: _ => /[a-z_][A-Za-z0-9_]*/,
type_identifier: _ => /[A-Z][A-Za-z0-9_]*/,
integer: _ => token(choice(
  /0[xX][0-9A-Fa-f](?:_?[0-9A-Fa-f])*/,
  /[0-9](?:_?[0-9])*/,
)),
string: _ => token(seq('"', repeat(choice(/[^"\\\n]/, /\\./)), '"')),
boolean: _ => choice('true', 'false'),
hash_bang_line: _ => token(seq('#!', /[^\n]*/)),
comment: _ => token(choice(
  seq('///', /[^\n]*/),
  seq('//', /[^\n]*/),
  seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
)),
```

Place `optional($.hash_bang_line)` only at the beginning of `source_file`. Confirm exact identifier and literal constraints against the pinned `Quint.g4`; adjust the regex and corpus together if upstream 0.32.0 is stricter than the documented baseline.

Change the `module` name field to `choice($.identifier, $.type_identifier)` and update the Task 1 corpus expectation so `Example` is a `type_identifier`. Keep this distinction visible because downstream highlighting needs to distinguish capitalized module/type names from lowercase value names.

Change the module body to `repeat($._declaration)` and add the smallest declaration surface required by these lexical tests:

```js
_declaration: $ => $.operator_definition,
operator_definition: $ => seq(
  'val',
  field('name', $.identifier),
  '=',
  field('value', choice($.integer, $.string, $.boolean)),
  optional(';'),
),
```

Task 3 replaces this temporary body choice with the complete operator qualifier, parameter, return-type, and expression rules while preserving the visible `operator_definition` node and fields.

- [ ] **Step 4: Run lexical and full corpus tests**

Run: `npm run generate && npx tree-sitter test --filter "lexical" && npm run test:corpus`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add grammar.js src test/corpus/lexical.txt
git commit -m "feat: parse Quint lexical syntax"
```

---

### Task 3: Implement Modules and Core Declarations

**Files:**
- Modify: `grammar.js`
- Modify: `test/corpus/modules_and_declarations.txt`
- Regenerate: `src/parser.c`
- Regenerate: `src/grammar.json`
- Regenerate: `src/node-types.json`

**Interfaces:**
- Produces: `const_declaration`, `var_declaration`, `assume_declaration`, `operator_definition`, parameter lists, qualifiers, and nested declaration expressions.
- Produces fields: `name`, `parameters`, `type`, `value`, and `body`.

- [ ] **Step 1: Add failing declaration cases**

Add separate corpus cases for:

```quint
module Declarations {
  const N: int
  var x: int
  assume positive = N > 0
  pure def increment(a: int): int = a + 1
  pure val initial = 0
  val current = x
  def next(a) = a + 1
  action init = x' = 0
  run simulate = all { init }
  temporal invariant = always(x >= 0)
}
```

Also cover empty parameters, typed and untyped parameters where upstream permits them, optional return types, optional semicolons, `nondet`, and a nested declaration followed by its body expression.

- [ ] **Step 2: Verify failure**

Run: `npm run generate && npx tree-sitter test --filter "declaration"`

Expected: FAIL at the first declaration.

- [ ] **Step 3: Implement declarations with stable fields**

Replace the bootstrap module body with `repeat($._declaration)`. Introduce a hidden declaration choice and explicit visible rules:

```js
_declaration: $ => choice(
  $.const_declaration,
  $.var_declaration,
  $.assume_declaration,
  $.operator_definition,
),
const_declaration: $ => seq('const', field('name', $.identifier), ':', field('type', $._type), optional(';')),
var_declaration: $ => seq('var', field('name', $.identifier), ':', field('type', $._type), optional(';')),
assume_declaration: $ => seq('assume', field('name', $.identifier), '=', field('value', $._expression), optional(';')),
```

Define operator qualifiers from the pinned grammar, not from memory. Keep qualifier, definition name, parameters, return type, and body structurally separate. Do not infer effect or mode correctness in the grammar.

Task 4 extends `_declaration` with `type_declaration`, `import_declaration`, `export_declaration`, and `instance_declaration` at the same time those rules are introduced; never reference a not-yet-defined grammar rule.

- [ ] **Step 4: Run declaration tests and inspect node types**

Run: `npm run generate && npx tree-sitter test --filter "declaration" && jq '.[] | select(.type | test("declaration|operator_definition"))' src/node-types.json`

Expected: tests PASS; visible declarations expose the planned fields.

- [ ] **Step 5: Commit**

```bash
git add grammar.js src test/corpus/modules_and_declarations.txt
git commit -m "feat: parse Quint modules and declarations"
```

---

### Task 4: Implement Imports, Instances, and the Complete Type Grammar

**Files:**
- Modify: `grammar.js`
- Create: `test/corpus/imports_and_instances.txt`
- Create: `test/corpus/types.txt`
- Regenerate: `src/parser.c`
- Regenerate: `src/grammar.json`
- Regenerate: `src/node-types.json`

**Interfaces:**
- Produces: import/export/instance nodes without resolving paths or modules.
- Produces: `_type` and every public type node consumed by declaration and expression tasks.

- [ ] **Step 1: Add failing import and instance cases**

Cover each shape independently:

```quint
import Math
import Math.pow
import Math.*
import Math as M
import Math.* from "./math"
export Math.*
import Voting(Value = Set(0, 1)) as V
import Voting(Value = Set(0, 1)).*
```

Assert fields for module name, member, alias, overrides, and source path. The grammar must retain `from` text but perform no `.qnt` suffixing or file access.

- [ ] **Step 2: Add failing type cases**

Cover:

```quint
type Abstract
type Temperature = int
type Option[a] = | Some(a) | None
type Pair[a, b] = (a, b)
type Row = { name: str, count: int }
type Sets = Set[int]
type Lists = List[str]
type Function = int -> str
type Operator = (int, str) => bool
```

Include nested applications, record row syntax if present in `Quint.g4`, trailing commas, and the precise upstream forms for abstract, alias, polymorphic, and sum types.

- [ ] **Step 3: Verify both suites fail**

Run: `npm run generate && npx tree-sitter test --filter "import|instance|type"`

Expected: FAIL on missing rules.

- [ ] **Step 4: Implement imports and types**

Keep declaration-only module instances separate from expression calls. Implement types through one hidden entry point:

```js
_type: $ => choice(
  $.primitive_type,
  $.named_type,
  $.type_application,
  $.tuple_type,
  $.record_type,
  $.function_type,
  $.operator_type,
),
primitive_type: _ => choice('bool', 'int', 'str'),
```

Use precedence only where the upstream type grammar requires it: type application must bind before function arrows, and function arrows must use the upstream associativity. Sum variants remain children of `type_declaration` or a visible `sum_type` node according to the corpus-approved CST.

- [ ] **Step 5: Run focused and full tests**

Run: `npm run generate && npx tree-sitter test --filter "import|instance|type" && npm run test:corpus`

Expected: PASS with no unresolved conflicts.

- [ ] **Step 6: Commit**

```bash
git add grammar.js src test/corpus/imports_and_instances.txt test/corpus/types.txt
git commit -m "feat: parse Quint modules and types"
```

---

### Task 5: Implement Expressions and Lock Operator Precedence

**Files:**
- Modify: `grammar.js`
- Create: `test/corpus/expressions.txt`
- Create: `test/corpus/precedence.txt`
- Regenerate: `src/parser.c`
- Regenerate: `src/grammar.json`
- Regenerate: `src/node-types.json`

**Interfaces:**
- Produces: `_expression`, primary/collection expressions, calls and access, unary/binary expressions, lambdas, conditionals, action blocks, logical blocks, pairs, and delayed assignments.
- Consumes: identifiers, literals, declarations, and types from Tasks 2–4.

- [ ] **Step 1: Add failing primary and postfix expression cases**

Cover literals, qualified names, unit, grouping, tuples, lists, records, calls, UFCS, field access, tuple access, and indexing:

```quint
module Expressions {
  val qualified = Math::pow
  val unit = ()
  val tuple = (1, "a")
  val list = [1, 2, 3]
  val record = { name: "q", count: 1 }
  val call = f(1, 2)
  val ufcs = value.f(1)
  val field = record.name
  val element = tuple._1
  val indexed = list[0]
}
```

- [ ] **Step 2: Add failing control, lambda, block, and precedence cases**

Cover `if`, every accepted lambda parameter shape, `all`, `any`, `and`, `or`, pair expressions, delayed assignments, all unary/infix operators, and trailing commas. For each precedence boundary, assert the nested CST; include at least:

```quint
a + b * c
a ^ b ^ c
-a * b
a == b and c == d
x' = a + b
a implies b iff c
a leadsTo b
key -> value
```

- [ ] **Step 3: Verify failure**

Run: `npm run generate && npx tree-sitter test --filter "expression|precedence"`

Expected: FAIL because `_expression` is incomplete.

- [ ] **Step 4: Implement expressions with named precedence constants**

At the top of `grammar.js`, add a table ordered to match the pinned Quint 0.32.0 precedence source:

```js
const PREC = {
  PAIR: 1,
  BLOCK: 2,
  LEADS_TO: 3,
  IMPLIES: 4,
  IFF: 5,
  OR: 6,
  AND: 7,
  ASSIGN: 8,
  COMPARE: 9,
  ADD: 10,
  MULTIPLY: 11,
  UNARY: 12,
  POWER: 13,
  POSTFIX: 14,
}
```

Before implementation, compare every numeric relationship with the official precedence table and `Quint.g4`; change names or numbers together with `precedence.txt` when the pinned implementation differs. Implement `^` with `prec.right`, normal left-associative operators with `prec.left`, assignment with its upstream associativity, and postfix calls/access/index with the highest precedence.

- [ ] **Step 5: Resolve ambiguity from evidence**

Run `npm run generate` after each expression family. For every unresolved conflict, first add or confirm a corpus case, then choose factoring, static precedence, associativity, or a documented intentional `conflicts` entry. Do not add an untested conflict declaration.

- [ ] **Step 6: Run the expression, precedence, and full suites**

Run: `npm run generate && npx tree-sitter test --filter "expression|precedence" && npm run test:corpus`

Expected: PASS; the precedence corpus shows the expected nesting.

- [ ] **Step 7: Commit**

```bash
git add grammar.js src test/corpus/expressions.txt test/corpus/precedence.txt
git commit -m "feat: parse Quint expressions"
```

---

### Task 6: Implement Patterns, Match, Destructuring, and Error Recovery

**Files:**
- Modify: `grammar.js`
- Create: `test/corpus/patterns_and_match.txt`
- Create: `test/corpus/errors.txt`
- Regenerate: `src/parser.c`
- Regenerate: `src/grammar.json`
- Regenerate: `src/node-types.json`

**Interfaces:**
- Produces: identifier, wildcard, tuple, record, and variant patterns; `match_expression` and `match_arm`.
- Extends: `operator_definition` to accept upstream-supported `val`/`pure val` destructuring.

- [ ] **Step 1: Add failing match and destructuring cases**

Cover:

```quint
module Matching {
  type Option[a] = | Some(a) | None
  val pair = (1, 2)
  val (left, right) = pair
  val { name, count } = { name: "q", count: 1 }
  def unwrap(value) = match value {
    | Some(x) => x
    | None => 0
    | _ => -1
  }
}
```

Verify the exact tuple and record destructuring syntax against pinned parser tests. Add zero-payload and payload variants, wildcard arms, multiple binders where accepted, and trailing separators.

- [ ] **Step 2: Add explicit recovery cases**

In `test/corpus/errors.txt`, assert the CST and `ERROR`/missing-node placement for incomplete module names, declarations, type annotations, calls, records, match arms, and closing braces. Include a case where a malformed declaration is followed by a valid one and assert that the later declaration remains a sibling under `module`.

- [ ] **Step 3: Verify failure**

Run: `npm run generate && npx tree-sitter test --filter "match|destructuring|error"`

Expected: FAIL on missing pattern/match rules and mismatched recovery trees.

- [ ] **Step 4: Implement patterns and match**

Use a hidden pattern entry point:

```js
_pattern: $ => choice(
  $.identifier_pattern,
  $.wildcard_pattern,
  $.tuple_pattern,
  $.record_pattern,
  $.variant_pattern,
),
```

Give each `match_arm` a `pattern` and `body` field. Keep constructor capitalization constraints aligned with the pinned grammar. Factor declaration starts and delimiters so malformed constructs recover at commas, semicolons, declaration keywords, match-arm pipes, and closing braces without swallowing later declarations.

- [ ] **Step 5: Run recovery and regression tests**

Run: `npm run generate && npx tree-sitter test --filter "match|destructuring|error" && npm run test:corpus`

Expected: PASS; error corpus contains only intentional errors.

- [ ] **Step 6: Commit**

```bash
git add grammar.js src test/corpus/patterns_and_match.txt test/corpus/errors.txt
git commit -m "feat: parse Quint patterns and match expressions"
```

---

### Task 7: Add Version-pinned Quint Compatibility Fixtures

**Files:**
- Create: `test/fixtures/quint-0.32.0/PROVENANCE.md`
- Create: `test/fixtures/quint-0.32.0/*.qnt`
- Create: `test/scripts/check-fixtures.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: npm script `test:fixtures`.
- Consumes: complete parser and generated Node binding language object.

- [ ] **Step 1: Record immutable provenance before copying inputs**

Create `PROVENANCE.md` containing a table with `fixture`, `source URL`, `Quint version`, `commit SHA`, `upstream license`, `local status`, and `covered grammar families`. Populate the exact tag and SHA for Quint 0.32.0. Do not use `main` URLs as the immutable reference.

- [ ] **Step 2: Add representative fixtures legally**

Select the upstream comprehensive parser fixture plus smaller files covering modules/imports, sum types/match, destructuring, actions, temporal expressions, and complex types. If upstream licensing does not clearly permit copying a file, create an original equivalent and mark `local status` as `original equivalent` rather than `copied`.

- [ ] **Step 3: Write a failing fixture checker**

Create `test/scripts/check-fixtures.mjs` that:

```js
import fs from 'node:fs'
import path from 'node:path'
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
```

Adjust module syntax (`import` versus `require`, default export shape) to match the Node template selected in Task 9; keep the no-fixtures and `hasError` assertions unchanged.

- [ ] **Step 4: Run the checker and verify it exposes missing integration**

Run: `node test/scripts/check-fixtures.mjs`

Expected: FAIL until the Node binding is available, or FAIL with a fixture-specific parse tree if grammar coverage is incomplete.

- [ ] **Step 5: Fix only demonstrated grammar gaps**

For every unexpected error, reduce it to a new corpus case, verify the corpus case fails, update `grammar.js`, regenerate, and rerun both corpus and fixture checks. Do not weaken the checker or add broad conflicts to make fixtures pass.

- [ ] **Step 6: Commit fixture evidence and any grammar fixes**

```bash
git add grammar.js src test/fixtures test/scripts/check-fixtures.mjs package.json
git commit -m "test: validate Quint 0.32.0 compatibility fixtures"
```

---

### Task 8: Add and Test Syntax Highlighting

**Files:**
- Create: `queries/highlights.scm`
- Create: `test/highlight/basic.qnt`
- Modify: `package.json`

**Interfaces:**
- Produces: npm script `test:highlight` and Tree-sitter standard highlight captures.
- Consumes: stable CST node and field names from Tasks 1–6.

- [ ] **Step 1: Write failing annotated highlight tests**

Create `test/highlight/basic.qnt` with examples and caret assertions for module/type names, declaration names, parameters, constructors, keywords, builtin types, literals, comments, operators, and function calls. Include syntactically indistinguishable references without asserting semantic captures.

- [ ] **Step 2: Verify the queries are absent**

Run: `npx tree-sitter test --highlight`

Expected: FAIL because `queries/highlights.scm` does not exist or captures are missing.

- [ ] **Step 3: Implement CST-based captures**

Start with structural captures such as:

```scheme
(comment) @comment
(string) @string
(integer) @number
(boolean) @boolean
(primitive_type) @type.builtin
(module name: (identifier) @module)
(type_declaration name: (_) @type)
(operator_definition name: (identifier) @function)
(parameter name: (identifier) @variable.parameter)
(call_expression function: (identifier) @function.call)
```

Capture literal keywords and operators from their containing CST patterns. Use the official Quint TextMate grammar only to check intended categories, not as a source of regex parsing logic.

- [ ] **Step 4: Run highlight and corpus tests**

Run: `npx tree-sitter test --highlight && npm run test:corpus`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add queries/highlights.scm test/highlight/basic.qnt package.json
git commit -m "feat: add Quint syntax highlighting queries"
```

---

### Task 9: Build and Package the Node Binding

**Files:**
- Modify: `package.json`
- Create: `binding.gyp`
- Create: `bindings/node/binding.cc`
- Create: `bindings/node/index.js`
- Create: `bindings/node/index.d.ts`
- Create: `bindings/node/binding_test.js`
- Modify: `test/scripts/check-fixtures.mjs`
- Generate: `package-lock.json`

**Interfaces:**
- Produces: CommonJS `require('tree-sitter-quint')` language object compatible with the `tree-sitter` Node parser.
- Produces: npm scripts `install`, `test:node`, `test:fixtures`, and aggregate `test`.

- [ ] **Step 1: Write the failing Node binding test**

Create `bindings/node/binding_test.js`:

```js
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
```

- [ ] **Step 2: Install exact binding dependencies and verify failure**

Add these exact development dependencies and record them in `package-lock.json`:

```json
{
  "devDependencies": {
    "node-addon-api": "8.3.1",
    "node-gyp-build": "4.8.4",
    "tree-sitter": "0.25.0",
    "tree-sitter-cli": "0.26.13"
  }
}
```

Keep `node-addon-api` and `node-gyp-build` available to package installation through the dependency sections produced by the CLI 0.26.13 template; use the exact versions above rather than `latest` or unbounded ranges. Treat `tree-sitter` as the test runtime and peer-facing compatibility baseline.

Run: `node --test bindings/node/binding_test.js`

Expected: FAIL because the native addon is absent.

- [ ] **Step 3: Generate the official Node binding scaffold**

Run `npx tree-sitter init` in a temporary directory with language name `quint`, C and Node bindings enabled, then copy only the version-matched `binding.gyp`, `bindings/node/binding.cc`, loader, and type declaration shapes into this repository. Reconcile metadata manually so the command does not overwrite `grammar.js`, corpus, or package metadata.

The C++ bridge must call exactly:

```cpp
extern "C" const TSLanguage *tree_sitter_quint();
```

and export that language pointer using the N-API shape generated by CLI 0.26.13. Do not substitute an older NAN/V8 binding template.

- [ ] **Step 4: Build and run Node and fixture tests**

Run: `npm install && node --test bindings/node/binding_test.js && node test/scripts/check-fixtures.mjs`

Expected: PASS.

- [ ] **Step 5: Verify npm package contents**

Run: `npm pack --dry-run`

Expected: output includes `grammar.js`, `tree-sitter.json`, `queries/highlights.scm`, `src/parser.c`, `src/node-types.json`, `binding.gyp`, and `bindings/node/*`; it excludes corpus and unrelated development files.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json binding.gyp bindings/node test/scripts/check-fixtures.mjs
git commit -m "feat: add Node binding for Quint parser"
```

---

### Task 10: Add CI, Documentation, and Release Checks

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`
- Create: `LICENSE`
- Modify: `package.json`
- Modify: `test/fixtures/quint-0.32.0/PROVENANCE.md`

**Interfaces:**
- Produces: a clean-checkout verification workflow and documented public package contract.
- Consumes: all scripts and artifacts from Tasks 1–9.

- [ ] **Step 1: Make the aggregate test script complete**

Set scripts so `npm test` runs, in order, corpus tests, highlight tests, Node tests, fixture tests, and generated-artifact verification. Add a separate `test:all` alias only if CI needs a name that avoids npm lifecycle behavior.

- [ ] **Step 2: Add CI and observe the first complete local run**

Create `.github/workflows/ci.yml` with `pull_request` and `push` triggers, `ubuntu-latest`, Node 22, `npm ci`, `npm test`, and `npm pack --dry-run`. The workflow must not download a moving Quint `main`; fixtures are already pinned in the repository.

Run locally: `npm ci && npm test && npm pack --dry-run`

Expected: PASS. If `check:generated` sees `package-lock.json` or native build output, narrow its path list to committed generated grammar artifacts rather than ignoring real parser differences.

- [ ] **Step 3: Write the public contract in README**

Document:

- Quint 0.32.0 and Tree-sitter CLI 0.26.13 compatibility;
- npm installation and Node parsing example;
- `.qnt` file type and `source.quint` scope;
- syntax-only responsibility and semantic non-goals;
- generated artifact policy;
- corpus, fixture, highlight, and Node test commands;
- upstream comparison and update workflow;
- current binding targets and intentionally unsupported packages; and
- CST changes as a versioned compatibility surface.

- [ ] **Step 4: Add the selected license text and reconcile provenance**

Add the full text corresponding to the license approved in Task 1. Confirm `package.json`, `tree-sitter.json`, `LICENSE`, copied fixture notices, and `PROVENANCE.md` agree.

- [ ] **Step 5: Run final clean-checkout-equivalent verification**

Run:

```bash
npm ci
npm test
npm pack --dry-run
git diff --check
git status --short
```

Expected: all tests PASS; package contents match the README; only intentional documentation/CI changes remain before the commit.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml README.md LICENSE package.json package-lock.json test/fixtures/quint-0.32.0/PROVENANCE.md
git commit -m "docs: prepare tree-sitter Quint for release"
```

## Final Verification Gate

- [ ] Run `npm ci` from a clean working tree.
- [ ] Run `npm run generate` and confirm `git diff --exit-code -- src grammar.js tree-sitter.json`.
- [ ] Run the complete corpus, highlight, Node, and fixture suites through `npm test`.
- [ ] Run `npx tree-sitter parse test/fixtures/quint-0.32.0/*.qnt --quiet` and confirm no unexpected parse failures.
- [ ] Run `npm pack --dry-run` and inspect the complete file list.
- [ ] Inspect `src/node-types.json` for accidental visible-node or field-name changes.
- [ ] Compare the rule-coverage inventory against the pinned Quint 0.32.0 `Quint.g4`; every syntax rule must map to a grammar rule and a corpus or fixture case.
- [ ] Confirm `PROVENANCE.md` contains immutable references and a redistribution decision for every fixture.
- [ ] Confirm CI pins Node, the Tree-sitter CLI, and dependency lockfile versions.
- [ ] Confirm `git status --short` is clean after regeneration and all tests.
