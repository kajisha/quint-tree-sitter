# Quint `.qnt` Grammar Conformance Design

## Goal

Make `tree-sitter-quint` parse every syntactically valid ordinary `.qnt`
source accepted by Quint v0.32.0's `modules` entry point without `ERROR` or
missing nodes, while retaining useful Tree-sitter recovery for incomplete
editor input.

## Authoritative baseline

The syntax authority is the generated `Quint.g4` at Quint v0.32.0 commit
`fd772606588b40def9978d8c82da69c2db7a0e3b`. Its recorded SHA-256 is
`4a7129cfd2e75f115a80cf4c1bb07273d7c3f2728b1f4421ec4112aace07bf36`.
Quint's `main` branch currently contains the same grammar, but conformance
tests must use the immutable release commit rather than a moving branch.

Compatibility covers the `modules` entry point used by normal `.qnt` files.
It includes lexical rules and all parser alternatives reachable from that
entry point.

## Non-goals

- The REPL-only `declarationOrExpr` entry point.
- Exact reproduction of ANTLR parser actions, QNT diagnostic codes, messages,
  or recovery positions.
- Module and import resolution, name resolution, declaration ordering, effect
  or mode checking, type checking, and other semantic validation.
- Rejection equivalence for every invalid input. Tree-sitter may recover from
  invalid or incomplete editor input differently from Quint's ANTLR parser.

An empty source may remain a clean Tree-sitter recovery state even though the
official `modules` rule requires at least one module.

## Priority order

1. All officially valid ordinary `.qnt` syntax parses without `ERROR` or
   missing nodes.
2. Incremental parsing remains practical for Neovim syntax highlighting.
3. Existing named CST nodes, fields, and highlight captures remain compatible.

If CST compatibility conflicts with syntax conformance, syntax conformance
wins and the compatibility change is documented and versioned.

## Chosen approach

Preserve the current CST where possible and resolve ambiguity with focused
grammar rules, declared conflicts, and static or dynamic precedence. Do not
use newlines or formatting as declaration boundaries because whitespace is
not significant in Quint.

The first target is the ambiguity around Quint's `operDef expr` let-in form.
The current grammar can greedily absorb the following body expression into a
local declaration's right-hand side. Two known manifestations are:

```quint
val (x2, y2) = t2
(x1 + x2, y1 + y2)
```

where the tuple body may be consumed as arguments to `t2`, and:

```quint
nondet message = messages.oneOf()
all { enabled, step }
```

where a dot call may be split into field access plus a unit body. The grammar
must retain both viable parses until enough context exists to select the
complete local declaration followed by its body.

If focused conflict and precedence changes cannot satisfy the conformance and
performance gates, redesign expression and local-declaration rules to mirror
`Quint.g4` more directly. This fallback may change the CST and therefore also
requires coordinated node-type, query, documentation, and Neovim integration
updates.

## Conformance evidence

Conformance uses three complementary layers.

### Alternative-level corpus

Every lexer and parser alternative reachable from `modules` must cite a
specific Tree-sitter corpus section or immutable upstream fixture. The
coverage checker must validate these concrete references rather than only
checking that a broad evidence file exists.

Corpus tests assert exact CST shape for ambiguity boundaries and other syntax
where the Tree-sitter representation is part of the package contract.

### Official success fixtures

Fixtures that Quint's own parser tests explicitly expect to parse without
errors are copied under the existing v0.32.0 provenance and checked for both
`rootNode.hasError === false` and absence of missing nodes. The tuple and record
destructuring fixtures are required because they exercise local let-in forms
that a broad smoke fixture does not cover.

### Pinned upstream source sweep

A manifest records ordinary `.qnt` paths that the official v0.32.0 phase-one
parser accepts without syntax errors. A dedicated conformance command receives
a read-only checkout of the pinned Quint commit, validates the expected commit
and manifest paths, parses every listed source with `tree-sitter-quint`, and
rejects any `ERROR` or missing node.

Hosted CI checks out that full commit by SHA and treats it only as input data;
it does not execute upstream code. Normal local tests remain offline. The
external sweep is a release gate, not a runtime or npm dependency.

Intentionally invalid upstream fixtures are excluded from the valid-input
manifest. They do not form a rejection-equivalence suite.

## Generated artifacts and queries

Changes to `grammar.js` are regenerated with the pinned Tree-sitter CLI.
`src/grammar.json`, `src/node-types.json`, `src/parser.c`, and scanner artifacts
must match a fresh generation.

Existing named nodes and fields are preserved unless the fallback redesign is
required. Any intentional CST change must update:

- `src/node-types.json` and its cardinality test,
- `queries/highlights.scm` and highlight assertions,
- Node binding expectations,
- README compatibility notes, and
- `quint.nvim` integration tests when capture behavior changes.

## Error recovery

Valid inputs must never depend on Tree-sitter recovery. Incomplete and invalid
inputs may contain `ERROR` or missing nodes, but recovery should remain local
enough that later declarations can still be highlighted. Existing recovery
corpus tests remain mandatory.

No special scanner may make newline placement semantically significant.

## Performance

The pinned upstream source sweep doubles as a realistic parsing workload. It
must finish within the CI job timeout without parser timeouts or pathological
memory growth. Large representative fixtures are also parsed through the Node
binding during local verification.

Hard per-file millisecond thresholds are avoided because they are unstable
across CI hardware. A focused benchmark comparison is required if grammar
generation reports substantially larger parse tables or if the sweep becomes
materially slower than the v0.1.0 baseline.

## Verification gates

Completion requires fresh successful evidence from:

- focused red-green corpus tests for each corrected ambiguity,
- all Tree-sitter corpus and recovery tests,
- official v0.32.0 success fixtures,
- the pinned upstream valid-source sweep,
- highlight query tests,
- Node binding and TypeScript declaration tests,
- node-type cardinality tests,
- generated-artifact consistency,
- package contents and offline installation checks under Node 22, and
- a Neovim integration parse and capture check through `quint.nvim`.

## Failure and fallback conditions

Switch from the compatibility-preserving approach to the direct grammar
redesign if any of these conditions persists after focused conflict and
precedence work:

- a valid upstream source still produces `ERROR` or missing nodes,
- local recovery corrupts later valid declarations,
- parse table size or real-source parsing cost increases materially, or
- the fix relies on newline placement that Quint itself ignores.

The redesign must be reviewed as a CST compatibility change. It must not be
silently released as a patch if consumers need query or node traversal changes.

## Definition of done

The work is complete when all valid-input and package gates pass, no known
officially valid `.qnt` counterexample remains, the worktree contains only the
reviewed implementation and test changes, and any CST or integration impact is
documented. This is an evidence-backed compatibility claim, not a mathematical
proof over the infinite recursive language.
