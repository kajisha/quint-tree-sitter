# Quint 0.32.0 compatibility fixture provenance

These fixtures are original, repository-local examples. They were written to exercise syntax documented by the immutable Quint 0.32.0 grammar; no upstream `.qnt` file was copied.

- Quint tag: [`v0.32.0`](https://github.com/quint-co/quint/releases/tag/v0.32.0)
- Quint commit: [`fd772606588b40def9978d8c82da69c2db7a0e3b`](https://github.com/quint-co/quint/commit/fd772606588b40def9978d8c82da69c2db7a0e3b)
- Upstream grammar: [`quint/src/generated/Quint.g4`](https://github.com/quint-co/quint/blob/fd772606588b40def9978d8c82da69c2db7a0e3b/quint/src/generated/Quint.g4)
- Upstream license: [Apache License 2.0](https://github.com/quint-co/quint/blob/fd772606588b40def9978d8c82da69c2db7a0e3b/LICENSE)

The full commit SHA is also recorded as the `gitHead` for the published `@informalsystems/quint@0.32.0` package. Compatibility claims are limited to syntactic acceptance of the grammar families listed below; these fixtures do not claim semantic validation or exhaustive Quint compatibility.

| fixture | source URL | Quint version | commit SHA | upstream license | local status | covered grammar families |
| --- | --- | --- | --- | --- | --- | --- |
| `modules-imports.qnt` | [Quint 0.32.0 grammar](https://github.com/quint-co/quint/blob/fd772606588b40def9978d8c82da69c2db7a0e3b/quint/src/generated/Quint.g4) | `v0.32.0` | `fd772606588b40def9978d8c82da69c2db7a0e3b` | Apache-2.0 | original equivalent | modules, imports, exports, instances |
| `sum-match.qnt` | [Quint 0.32.0 grammar](https://github.com/quint-co/quint/blob/fd772606588b40def9978d8c82da69c2db7a0e3b/quint/src/generated/Quint.g4) | `v0.32.0` | `fd772606588b40def9978d8c82da69c2db7a0e3b` | Apache-2.0 | original equivalent | sum types, polymorphic types, match expressions, variant patterns |
| `destructuring.qnt` | [Quint 0.32.0 grammar](https://github.com/quint-co/quint/blob/fd772606588b40def9978d8c82da69c2db7a0e3b/quint/src/generated/Quint.g4) | `v0.32.0` | `fd772606588b40def9978d8c82da69c2db7a0e3b` | Apache-2.0 | original equivalent | tuple destructuring, record destructuring, local declarations |
| `actions-temporal.qnt` | [Quint 0.32.0 grammar](https://github.com/quint-co/quint/blob/fd772606588b40def9978d8c82da69c2db7a0e3b/quint/src/generated/Quint.g4) | `v0.32.0` | `fd772606588b40def9978d8c82da69c2db7a0e3b` | Apache-2.0 | original equivalent | state variables, actions, delayed assignment, action blocks, temporal expressions |
| `complex-types.qnt` | [Quint 0.32.0 grammar](https://github.com/quint-co/quint/blob/fd772606588b40def9978d8c82da69c2db7a0e3b/quint/src/generated/Quint.g4) | `v0.32.0` | `fd772606588b40def9978d8c82da69c2db7a0e3b` | Apache-2.0 | original equivalent | records and row types, tuples, nested type applications, function and operator types |
