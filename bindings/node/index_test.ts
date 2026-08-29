import Parser = require('tree-sitter')
import Quint = require('./')

const parser = new Parser()
parser.setLanguage(Quint)

const languageName: 'quint' = Quint.name

type NodeInfo = (typeof Quint.nodeTypeInfo)[number]

const child: NodeInfo = {
  type: 'identifier',
  named: true,
  subtypes: [],
}

const withFields: NodeInfo = {
  type: 'module',
  named: true,
  fields: {
    name: {
      multiple: false,
      required: true,
      types: [{ type: 'identifier', named: true }],
    },
  },
  children: [],
}

const withChildren: NodeInfo = {
  type: 'source_file',
  named: true,
  fields: {},
  children: [{
    multiple: true,
    required: false,
    types: [{ type: 'module', named: true }],
  }],
}

const withSubtypes: NodeInfo = {
  type: '_expression',
  named: true,
  subtypes: [{ type: 'identifier', named: true }],
}

void [parser, languageName, child, withFields, withChildren, withSubtypes]
