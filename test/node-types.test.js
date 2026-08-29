const assert = require('node:assert/strict')
const nodeTypes = require('../src/node-types.json')

const nodesByType = new Map(nodeTypes.filter(node => node.named).map(node => [node.type, node]))

function assertSingleNamedField(nodeType, fieldName) {
  const field = nodesByType.get(nodeType)?.fields?.[fieldName]

  assert.ok(field, `${nodeType}.${fieldName} must exist`)
  assert.equal(field.multiple, false, `${nodeType}.${fieldName} must contain one child`)
  assert.ok(
    field.types.every(type => type.named),
    `${nodeType}.${fieldName} must contain only named nodes`,
  )
}

function assertField(nodeType, fieldName, { required, multiple, types }) {
  const field = nodesByType.get(nodeType)?.fields?.[fieldName]

  assert.ok(field, `${nodeType}.${fieldName} must exist`)
  assert.equal(field.required, required, `${nodeType}.${fieldName}.required`)
  assert.equal(field.multiple, multiple, `${nodeType}.${fieldName}.multiple`)
  assert.ok(field.types.every(type => type.named), `${nodeType}.${fieldName} types must be named`)
  if (types) {
    assert.deepEqual(
      field.types.map(type => type.type).sort(),
      [...types].sort(),
      `${nodeType}.${fieldName}.types`,
    )
  }
}

for (const [nodeType, fieldName] of [
  ['import_declaration', 'module'],
  ['import_declaration', 'member'],
  ['import_declaration', 'alias'],
  ['export_declaration', 'module'],
  ['export_declaration', 'member'],
  ['export_declaration', 'alias'],
  ['instance_declaration', 'module'],
  ['instance_declaration', 'alias'],
  ['instance_override', 'name'],
  ['function_type', 'parameter'],
  ['function_type', 'result'],
  ['operator_type', 'result'],
  ['parenthesized_type', 'type'],
  ['type_declaration', 'name'],
  ['type_declaration', 'value'],
  ['const_declaration', 'type'],
  ['var_declaration', 'type'],
  ['parameter', 'type'],
  ['record_field', 'type'],
  ['sum_variant', 'type'],
]) {
  assertSingleNamedField(nodeType, fieldName)
}

assert.equal(
  nodesByType.get('operator_type').fields.parameter.multiple,
  true,
  'operator_type.parameter remains repeated for multi-argument operators',
)

assertField('match_expression', 'value', { required: true, multiple: false })
assertField('match_expression', 'arm', {
  required: true,
  multiple: true,
  types: ['match_arm'],
})
assertField('match_arm', 'pattern', {
  required: true,
  multiple: false,
  types: ['variant_pattern', 'wildcard_pattern'],
})
assertField('match_arm', 'body', { required: true, multiple: false })
assertField('identifier_pattern', 'name', {
  required: true,
  multiple: false,
  types: ['identifier', 'type_identifier'],
})
assertField('variant_pattern', 'name', {
  required: true,
  multiple: false,
  types: ['identifier', 'type_identifier'],
})
assertField('variant_pattern', 'argument', {
  required: false,
  multiple: false,
  types: ['identifier_pattern', 'wildcard_pattern'],
})
assertField('tuple_pattern', 'element', {
  required: true,
  multiple: true,
  types: ['identifier_pattern', 'wildcard_pattern'],
})
assertField('record_pattern', 'field', {
  required: true,
  multiple: true,
  types: ['identifier_pattern'],
})
assertField('operator_definition', 'pattern', {
  required: false,
  multiple: false,
  types: ['record_pattern', 'tuple_pattern'],
})
assertField('module', 'name', {
  required: true,
  multiple: false,
  types: ['identifier', 'qualified_name', 'type_identifier'],
})
for (const declaration of ['const_declaration', 'var_declaration']) {
  assertField(declaration, 'name', {
    required: true,
    multiple: false,
    types: ['identifier', 'qualified_name', 'type_identifier'],
  })
}
for (const nodeType of ['assume_declaration', 'parameter']) {
  assertField(nodeType, 'name', {
    required: true,
    multiple: false,
    types: ['hole', 'identifier', 'qualified_name', 'type_identifier'],
  })
}
assertField('operator_definition', 'name', {
  required: false,
  multiple: false,
  types: ['identifier', 'qualified_name', 'type_identifier'],
})

assert.deepEqual(nodesByType.get('sum_type').children, {
  multiple: true,
  required: true,
  types: [{ type: 'sum_variant', named: true }],
})

console.log('node-types field cardinality: ok')
