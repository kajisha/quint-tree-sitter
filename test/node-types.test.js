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

assert.equal(
  nodesByType.get('unary_expression').fields.operand.types.some(type => (
    type.type === 'unary_expression' && type.named
  )),
  true,
  'unary_expression.operand remains recursively unary',
)
assert.equal(
  nodesByType.get('parenthesized_expression').children.required,
  true,
  'parenthesized_expression keeps its required expression child',
)

for (const [nodeType, fieldName, includedTypes] of [
  ['binary_expression', 'right', ['declaration_expression', 'lambda_expression']],
  ['delayed_assignment', 'value', ['declaration_expression', 'lambda_expression']],
  ['pair_expression', 'value', ['declaration_expression', 'lambda_expression']],
  ['unary_expression', 'operand', ['declaration_expression', 'lambda_expression']],
]) {
  const actualTypes = nodesByType.get(nodeType).fields[fieldName].types.map(type => type.type)
  for (const includedType of includedTypes) {
    assert.equal(
      actualTypes.includes(includedType),
      true,
      `${nodeType}.${fieldName} includes valid low-precedence ${includedType}`,
    )
  }
}

for (const [nodeType, fieldName, excludedTypes] of [
  ['binary_expression', 'left', ['declaration_expression', 'lambda_expression', 'pair_expression']],
  ['binary_expression', 'right', ['pair_expression']],
  ['delayed_assignment', 'value', ['pair_expression']],
  ['field_access_expression', 'receiver', ['binary_expression', 'delayed_assignment', 'pair_expression', 'unary_expression']],
  ['index_expression', 'collection', ['binary_expression', 'delayed_assignment', 'pair_expression', 'unary_expression']],
  ['pair_expression', 'key', ['declaration_expression', 'lambda_expression']],
  ['pair_expression', 'value', ['pair_expression']],
  ['ufcs_expression', 'receiver', ['binary_expression', 'delayed_assignment', 'pair_expression', 'unary_expression']],
  ['unary_expression', 'operand', ['delayed_assignment', 'pair_expression']],
]) {
  const actualTypes = nodesByType.get(nodeType).fields[fieldName].types.map(type => type.type)
  for (const excludedType of excludedTypes) {
    assert.equal(
      actualTypes.includes(excludedType),
      false,
      `${nodeType}.${fieldName} excludes precedence-incompatible ${excludedType}`,
    )
  }
}

console.log('node-types field cardinality: ok')
