# Tree-sitter Quint Grammar Design

## 1. Goal

Build a reusable `tree-sitter-quint` grammar repository that covers the syntax accepted by Quint 0.32.0 and distributes:

- the Tree-sitter grammar and generated C parser;
- stable concrete-syntax-tree (CST) node types;
- syntax-highlighting queries; and
- a tested Node binding and npm package.

This project parses syntax only. It does not perform name resolution, import resolution, effect or mode checking, type checking, declaration ordering, or other semantic validation performed by Quint.

## 2. Sources of Truth

The compatibility baseline is Quint 0.32.0. Syntax acceptance is determined in this order:

1. the version-pinned [`Quint.g4`](https://github.com/quint-co/quint/blob/main/quint/src/generated/Quint.g4) grammar;
2. the official [Quint parser tests](https://github.com/quint-co/quint/blob/main/quint/test/parsing/quintParserFrontend.test.ts) and version-pinned official `.qnt` fixtures;
3. the official [Quint language summary](https://quint.sh/docs/lang), especially for language intent and operator precedence; and
4. the official [`quint.tmLanguage.json`](https://github.com/informalsystems/quint-grammars/blob/main/grammars/quint.tmLanguage.json), only as supplementary evidence for highlighting classifications.

The language summary predates parts of the implementation and is not sufficient by itself. When the summary and Quint 0.32.0 implementation differ, the pinned grammar and parser tests win. The implementation must record the exact upstream tag or commit SHA rather than read moving `main` during CI.

Tree-sitter behavior and repository structure follow the official documentation for [creating parsers](https://tree-sitter.github.io/tree-sitter/creating-parsers/1-getting-started.html), the [grammar DSL](https://tree-sitter.github.io/tree-sitter/creating-parsers/2-the-grammar-dsl.html), [writing grammars](https://tree-sitter.github.io/tree-sitter/creating-parsers/3-writing-the-grammar.html), [testing](https://tree-sitter.github.io/tree-sitter/creating-parsers/5-writing-tests.html), and [syntax highlighting](https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html).

## 3. Version and Distribution Baseline

- Supported Quint language version: `0.32.0`.
- Parser-generation baseline: Tree-sitter CLI `0.26.13`.
- Parser ABI: the CLI default for the pinned version, recorded in generated artifacts and CI.
- Repository name: `tree-sitter-quint`.
- Internal Tree-sitter language name: `quint`.
- Tree-sitter scope: `source.quint`.
- File extension: `.qnt`.
- Initial distribution targets: generated C parser and Node/npm package.
- Initial query surface: syntax highlighting.

Rust, Python, Go, Java, Swift, Zig, and Wasm packages are outside the initial release. They may be added only when there is a concrete consumer and a maintained test/release path.

## 4. Architecture and Responsibilities

```text
Quint 0.32.0
  |- Quint.g4
  |- parser tests
  `- pinned .qnt fixtures
          | compatibility evidence
          v
grammar.js -- tree-sitter generate --> src/parser.c
    |                                  |
    |- test/corpus/*.txt               `- Node binding / npm package
    `- queries/highlights.scm
```

### `grammar.js`

Defines lexical rules, modules, declarations, imports, exports, instances, types, expressions, and patterns. Operator precedence is centralized in named constants. Stable child relationships use `field()` names such as `name`, `parameters`, `type`, `value`, and `body`.

The grammar exposes meaningful syntax nodes and hides rules that only organize alternatives. It must not encode file access, module loading, name lookup, type rules, or other semantic checks.

### Generated parser artifacts

`tree-sitter generate` produces and updates `src/parser.c`, `src/grammar.json`, and `src/node-types.json`. Generated artifacts are committed so consumers do not need to generate the grammar when installing or embedding it.

### Corpus and fixtures

`test/corpus/` fixes the expected CST for isolated constructs and syntax combinations. `test/fixtures/` contains only official Quint inputs that can legally be redistributed, with provenance and the pinned upstream version recorded. If redistribution is not permitted or is unclear, equivalent original fixtures are written from the public grammar instead.

### Highlight queries

`queries/highlights.scm` captures syntax from CST nodes. The official TextMate grammar informs classification but is not copied as the parser or used as the syntax-acceptance authority.

### Node binding

The Node binding provides the conventional Tree-sitter language module used to load the generated parser. Its tests cover loading, setting the language on a parser, parsing representative Quint input, and packaging the generated native sources and queries.

## 5. Lexical Scope

The lexer must cover all tokens present in the Quint 0.32.0 grammar, including:

- lowercase and capitalized identifiers where the upstream grammar distinguishes them;
- reserved keywords, including `run`, `match`, temporal operators, and declaration qualifiers;
- decimal and hexadecimal integers, including permitted underscore separators;
- double-quoted strings;
- `//`, `///`, and `/* ... */` comments;
- a source-leading hashbang where accepted by Quint;
- multi-character tokens such as `::`, `=>`, `->`, `==`, `!=`, `>=`, and `<=`; and
- delayed assignment syntax using a primed name and `=`.

Whitespace and comments are extras. Comments use a named `comment` rule instead of duplicating a complex token in `extras`, following Tree-sitter's parser-size guidance.

No external scanner is part of the initial architecture. Current evidence indicates that the Quint 0.32.0 token set is expressible with Tree-sitter lexical rules. An external scanner is added only if a focused failing corpus test proves that a required token cannot be handled correctly and incrementally with the generated lexer.

## 6. Public CST

The public node set is organized as follows. Exact child shapes are fixed by corpus tests and the generated `node-types.json`.

### Root and modules

- `source_file`
- `module`

### Declarations

- `const_declaration`
- `var_declaration`
- `assume_declaration`
- `type_declaration`
- `operator_definition`
- `import_declaration`
- `export_declaration`
- `instance_declaration`

### Types

- `primitive_type`
- `named_type`
- `type_application`
- `tuple_type`
- `record_type`
- `function_type`
- `operator_type`
- `sum_type`

### Expressions

- identifiers, qualified identifiers, and literals;
- parenthesized, unit, tuple, record, and list expressions;
- unary and binary expressions;
- call, uniform-function-call-syntax (UFCS), field, tuple-element, and index access;
- lambda, conditional, and match expressions;
- action and non-action blocks; and
- delayed assignments.

### Patterns

- identifier patterns;
- wildcard patterns;
- tuple and record destructuring patterns; and
- sum-variant patterns.

Node names are a downstream API. Renaming visible nodes or fields requires corpus and query updates and is treated as a compatibility decision, not an incidental refactor.

## 7. Precedence and Ambiguity

Expression precedence follows the official Quint precedence table and the pinned implementation. Access and call bind most tightly; exponentiation is right-associative; unary, multiplicative, additive, comparison, assignment, logical, temporal, block, and pair forms follow in their specified order.

Focused tests must lock down these ambiguous surfaces:

- `{ ... }` as a module body, record, or block;
- `( ... )` as grouping, tuple, unit, or lambda parameters;
- `[...]` as type application or index access;
- `.` as UFCS, field access, or tuple-element access;
- `->` as a pair expression or function type;
- `=` as delayed assignment versus `==` as equality;
- `Foo(...)` as a call inside expressions versus module-instance syntax in declarations; and
- nested declarations followed by an expression.

Static and dynamic precedence are used only with a documented grammatical reason. `conflicts` is reserved for intentional ambiguity and must not be used merely to silence an unresolved-conflict error.

## 8. Error Recovery

The parser should preserve surrounding modules and later declarations while users edit incomplete declarations, types, expressions, and match arms. Recovery tests cover missing names, delimiters, types, bodies, operands, and closing braces.

Recovery does not mean semantic acceptance. Undefined names, invalid imports, type errors, effect errors, and declaration cycles can produce a clean syntax tree because those checks belong to Quint.

The release criteria distinguish:

- valid official fixtures, which must parse without unexpected `ERROR` or missing nodes; and
- intentionally incomplete corpus inputs, whose expected `ERROR` or missing-node placement is asserted explicitly.

## 9. Verification Strategy

### Grammar corpus

Corpus files are divided by lexical syntax, modules and declarations, imports and instances, types, expressions and precedence, patterns and match, and error recovery. Every visible node and every known ambiguous combination has an expected S-expression.

`tree-sitter test -u` may assist during development, but generated expectation changes are reviewed before acceptance.

### Quint compatibility

Representative inputs from every rule family in `Quint.g4` are tested. Version-pinned official fixtures accepted by Quint 0.32.0 must parse without unexpected Tree-sitter errors. Tree-sitter CSTs are not expected to match Quint's ANTLR parse trees or semantic IR.

The comparison is intentionally asymmetric: Tree-sitter must cover valid Quint syntax, while its recovery parser may produce trees for invalid or incomplete input that Quint rejects.

### Highlighting

`test/highlight/` asserts captures for declarations, definitions, references where syntactically knowable, types, constructors, keywords, operators, literals, comments, and punctuation where useful. Semantic distinctions that require name resolution are not guessed in highlight queries.

### Node binding and packaging

Node tests verify:

- the binding loads on supported Node versions;
- a Tree-sitter parser accepts the language object;
- representative `.qnt` content parses;
- packaged files include the grammar metadata, queries, generated parser sources, and binding sources; and
- installation does not require regenerating `grammar.js`.

### Continuous integration

CI pins the Tree-sitter CLI and performs:

1. grammar generation;
2. corpus tests;
3. highlight tests;
4. parsing of pinned representative fixtures;
5. Node binding build and tests; and
6. a clean-tree check proving committed generated artifacts match `grammar.js`.

## 10. Release Criteria

The initial release is complete when:

- every Quint 0.32.0 grammar rule is represented by an explicit mapping to Tree-sitter rules and corpus coverage;
- selected valid official fixtures parse without unexpected `ERROR` or missing nodes;
- all corpus, recovery, precedence, highlight, and Node binding tests pass;
- generated parser and node-type artifacts are reproducible with the pinned CLI;
- the npm package contains the grammar, queries, generated C parser, and Node binding;
- the README documents the compatibility baseline, supported distribution targets, syntax-only responsibility, and upstream-update procedure; and
- CI verifies all release claims from a clean checkout.

## 11. Upstream Maintenance

For each Quint minor release:

1. compare the pinned `Quint.g4`, parser tests, and relevant fixtures with the new release;
2. classify differences as lexical, syntactic, semantic-only, or documentation-only;
3. add failing corpus or compatibility tests for syntactic changes;
4. update the grammar and queries;
5. regenerate artifacts and run the complete verification suite; and
6. update the compatibility table and pinned upstream reference.

Breaking visible-node or field changes require a major grammar-package release. Additive syntax support that preserves the CST contract may use a minor release. Parser fixes with no intentional CST contract change may use a patch release.

## 12. Risks and Exit Conditions

### Principal risks

- Quint documentation and implementation can diverge.
- Brace, declaration-expression, call/access, and arrow constructs can create LR conflicts or poor recovery.
- A generated parser can accept examples while still exposing an unstable or inconvenient CST.
- Official fixtures may not be suitable for direct redistribution.
- Publishing more bindings than the project can continuously test would create unsupported compatibility promises.

### Mitigations

- Pin the implementation version and retain a grammar-rule coverage map.
- Write precedence and ambiguity tests before resolving each conflict.
- Treat `node-types.json`, corpus trees, and queries as one reviewed API surface.
- Record fixture provenance and replace unclear material with original equivalent cases.
- Limit the first release to C and Node/npm distribution.

### Reconsideration conditions

The architecture should be reconsidered if:

- required Quint syntax demonstrably needs stateful lexing, triggering a narrowly scoped external scanner design;
- upstream replaces or substantially restructures its grammar before compatibility work is complete;
- full 0.32.0 coverage cannot be achieved without an unmaintainable number of dynamic conflicts; or
- a real consumer requires a different stable CST shape before the first public release.

## 13. Explicit Non-goals

- Reimplementing Quint semantic analysis or module loading.
- Guaranteeing AST or IR equivalence with Quint's parser.
- Shipping editor-specific plugins.
- Publishing Rust, Python, Go, Java, Swift, Zig, or Wasm packages in the initial release.
- Automatically translating ANTLR grammar to Tree-sitter grammar.
- Tracking moving upstream `main` in release verification.
