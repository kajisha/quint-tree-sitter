import Quint = require('./')

type NodeInfo = (typeof Quint.nodeTypeInfo)[number]

const child: NodeInfo = {
  type: 'identifier',
  named: true,
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
}

const withChildren: NodeInfo = {
  type: 'source_file',
  named: true,
  children: {
    multiple: true,
    required: false,
    types: [{ type: 'module', named: true }],
  },
}

const withSubtypes: NodeInfo = {
  type: '_expression',
  named: true,
  subtypes: [{ type: 'identifier', named: true }],
}

void [child, withFields, withChildren, withSubtypes]
