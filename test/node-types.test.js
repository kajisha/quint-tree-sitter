const assert = require('node:assert/strict')
const nodeTypes = require('../src/node-types.json')

const nodesByType = new Map(nodeTypes.map(node => [node.type, node]))

function assertSingleNamedField(nodeType, fieldName) {
  const field = nodesByType.get(nodeType)?.fields?.[fieldName]

  assert.ok(field, `${nodeType}.${fieldName} must exist`)
  assert.equal(field.multiple, false, `${nodeType}.${fieldName} must contain one child`)
  assert.ok(
    field.types.every(type => type.named),
    `${nodeType}.${fieldName} must contain only named nodes`,
  )
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

console.log('node-types field cardinality: ok')
