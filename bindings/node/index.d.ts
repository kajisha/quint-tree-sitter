type BaseNode = {
  type: string
  named: boolean
}

type ChildNode = {
  multiple: boolean
  required: boolean
  types: BaseNode[]
}

type NodeInfo =
  | (BaseNode & {
      subtypes: BaseNode[]
    })
  | (BaseNode & {
      fields: { [name: string]: ChildNode }
      children: ChildNode[]
    })

/** The tree-sitter language object for this grammar. */
declare const binding: {
  /** The inner language object. */
  language: unknown

  /** The content of the `node-types.json` file for this grammar. */
  nodeTypeInfo: NodeInfo[]

  /** The syntax highlighting query for this grammar. */
  HIGHLIGHTS_QUERY?: string

  /** The language injection query for this grammar. */
  INJECTIONS_QUERY?: string

  /** The local variable query for this grammar. */
  LOCALS_QUERY?: string

  /** The symbol tagging query for this grammar. */
  TAGS_QUERY?: string
}

export = binding
