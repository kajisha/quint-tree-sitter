import Parser = require('tree-sitter')

/** The tree-sitter language object for this grammar. */
declare const binding: Parser.Language & {
  /** The Tree-sitter grammar name. */
  name: 'quint'

  /** The syntax highlighting query for this grammar. */
  HIGHLIGHTS_QUERY: string

  /** The language injection query for this grammar. */
  INJECTIONS_QUERY?: string

  /** The local variable query for this grammar. */
  LOCALS_QUERY?: string

  /** The symbol tagging query for this grammar. */
  TAGS_QUERY?: string
}

export = binding
