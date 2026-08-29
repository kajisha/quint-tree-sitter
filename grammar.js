const PREC = {
  TYPE_OPERATOR: 1,
  TYPE_FUNCTION: 2,
  BLOCK: 2,
  ASSIGN: 8,
  COMPARE: 9,
  ADD: 10,
  POSTFIX: 14,
}

module.exports = grammar({
  name: 'quint',

  extras: $ => [/\s/, $.comment],

  externals: $ => [$.hash_bang_line, $._file_start],

  conflicts: $ => [
    [$.tuple_type, $.operator_type],
  ],

  word: $ => $.identifier,

  rules: {
    source_file: $ => seq(choice($.hash_bang_line, $._file_start), repeat($.module)),
    module: $ => seq(
      'module',
      field('name', choice($.identifier, $.type_identifier)),
      '{',
      field('body', repeat($._declaration)),
      '}',
    ),
    _declaration: $ => choice(
      $.const_declaration,
      $.var_declaration,
      $.assume_declaration,
      $.operator_definition,
      $.type_declaration,
      $.import_declaration,
      $.export_declaration,
      $.instance_declaration,
    ),
    const_declaration: $ => seq(
      'const',
      field('name', choice($.identifier, $.type_identifier)),
      ':',
      field('type', $._type),
      optional(';'),
    ),
    var_declaration: $ => seq(
      'var',
      field('name', $.identifier),
      ':',
      field('type', $._type),
      optional(';'),
    ),
    assume_declaration: $ => seq(
      'assume',
      field('name', $.identifier),
      '=',
      field('value', $._expression),
      optional(';'),
    ),
    operator_definition: $ => choice(
      seq(
        field('qualifier', $.operator_qualifier),
        field('name', $.identifier),
        field('parameters', alias($._annotated_parameter_list, $.parameter_list)),
        ':',
        field('type', $._type),
        optional(seq('=', field('body', $._expression))),
        optional(';'),
      ),
      seq(
        field('qualifier', $.operator_qualifier),
        field('name', $.identifier),
        optional(field('parameters', alias($._untyped_parameter_list, $.parameter_list))),
        optional(seq(':', field('type', $._type))),
        optional(seq('=', field('body', $._expression))),
        optional(';'),
      ),
    ),
    operator_qualifier: _ => choice(
      'val',
      'def',
      seq('pure', 'val'),
      seq('pure', 'def'),
      'action',
      'run',
      'temporal',
      'nondet',
    ),
    parameter_list: $ => choice(
      $._annotated_parameter_list,
      $._untyped_parameter_list,
    ),
    _annotated_parameter_list: $ => seq(
      '(',
      alias($._annotated_parameter, $.parameter),
      repeat(seq(',', alias($._annotated_parameter, $.parameter))),
      optional(','),
      ')',
    ),
    _untyped_parameter_list: $ => seq(
      '(',
      optional(seq(
        alias($._untyped_parameter, $.parameter),
        repeat(seq(',', alias($._untyped_parameter, $.parameter))),
        optional(','),
      )),
      ')',
    ),
    parameter: $ => choice(
      $._annotated_parameter,
      $._untyped_parameter,
    ),
    _annotated_parameter: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._type),
    ),
    _untyped_parameter: $ => field('name', $.identifier),
    type_declaration: $ => choice(
      seq(
        'type',
        field('name', $.qualified_name),
      ),
      seq(
        'type',
        field('name', $.qualified_name),
        optional(seq(
          '[',
          field('type_parameter', $.identifier),
          repeat(seq(',', field('type_parameter', $.identifier))),
          ']',
        )),
        '=',
        field('value', choice($.sum_type, $._type)),
      ),
    ),
    import_declaration: $ => choice(
      seq(
        'import',
        field('module', $.qualified_name),
        '.',
        field('member', choice($.qualified_name, $.wildcard)),
        optional(seq('from', field('source', $.string))),
      ),
      seq(
        'import',
        field('module', $.qualified_name),
        optional(seq('as', field('alias', $.qualified_name))),
        optional(seq('from', field('source', $.string))),
      ),
    ),
    export_declaration: $ => choice(
      seq(
        'export',
        field('module', $.qualified_name),
        '.',
        field('member', choice($.qualified_name, $.wildcard)),
      ),
      seq(
        'export',
        field('module', $.qualified_name),
        optional(seq('as', field('alias', $.qualified_name))),
      ),
    ),
    instance_declaration: $ => seq(
      'import',
      field('module', $.qualified_name),
      field('overrides', $.instance_overrides),
      choice(
        seq('.', field('member', $.wildcard)),
        seq('as', field('alias', $.qualified_name)),
      ),
      optional(seq('from', field('source', $.string))),
    ),
    instance_overrides: $ => seq(
      '(',
      $.instance_override,
      repeat(seq(',', $.instance_override)),
      optional(','),
      ')',
    ),
    instance_override: $ => seq(
      field('name', $.qualified_name),
      '=',
      field('value', $._expression),
    ),
    wildcard: _ => '*',
    _type: $ => choice(
      $.operator_type,
      $.function_type,
      $._type_atom,
    ),
    _type_atom: $ => choice(
      $.primitive_type,
      $.named_type,
      $.type_application,
      $.tuple_type,
      $.record_type,
      $.parenthesized_type,
    ),
    primitive_type: _ => choice('bool', 'int', 'str'),
    named_type: $ => seq(
      choice($.identifier, $.type_identifier),
      repeat(seq('::', choice($.identifier, $.type_identifier))),
    ),
    type_application: $ => choice(
      seq(
        field('name', alias('Set', $.named_type)),
        '[',
        field('argument', $._type),
        ']',
      ),
      seq(
        field('name', alias('List', $.named_type)),
        '[',
        field('argument', $._type),
        ']',
      ),
      seq(
        field('name', $.named_type),
        '[',
        field('argument', $._type),
        repeat(seq(',', field('argument', $._type))),
        ']',
      ),
    ),
    tuple_type: $ => choice(
      seq('(', ')'),
      seq(
        '(',
        field('element', $._type),
        ',',
        field('element', $._type),
        repeat(seq(',', field('element', $._type))),
        optional(','),
        ')',
      ),
    ),
    record_type: $ => seq(
      '{',
      optional(choice(
        seq(
          $.record_field,
          repeat(seq(',', $.record_field)),
          optional(choice(
            ',',
            seq('|', field('tail', $.identifier)),
          )),
        ),
        seq('|', field('tail', $.identifier)),
      )),
      '}',
    ),
    record_field: $ => seq(
      field('name', choice($.identifier, $.type_identifier)),
      ':',
      field('type', $._type),
    ),
    function_type: $ => prec.right(PREC.TYPE_FUNCTION, seq(
      field('parameter', $._type_atom),
      '->',
      field('result', choice($.function_type, $._type_atom)),
    )),
    operator_type: $ => prec.right(PREC.TYPE_OPERATOR, choice(
      seq(
        '(',
        optional(seq(
          field('parameter', $._type),
          repeat(seq(',', field('parameter', $._type))),
          optional(','),
        )),
        ')',
        '=>',
        field('result', $._type),
      ),
      seq(
        field('parameter', choice(
          $.function_type,
          $.primitive_type,
          $.named_type,
          $.type_application,
          $.record_type,
        )),
        '=>',
        field('result', $._type),
      ),
    )),
    parenthesized_type: $ => seq(
      '(',
      field('type', $._type),
      ')',
    ),
    sum_type: $ => choice(
      seq(
        optional('|'),
        $.sum_variant,
        repeat1(seq('|', $.sum_variant)),
      ),
      seq(
        '|',
        $.sum_variant,
      ),
      alias($._sum_variant_with_payload, $.sum_variant),
    ),
    sum_variant: $ => seq(
      field('name', choice($.identifier, $.type_identifier)),
      optional(seq('(', field('type', $._type), ')')),
    ),
    _sum_variant_with_payload: $ => seq(
      field('name', choice($.identifier, $.type_identifier)),
      '(',
      field('type', $._type),
      ')',
    ),
    _expression: $ => choice(
      $.identifier,
      $.type_identifier,
      $.integer,
      $.string,
      $.boolean,
      $.binary_expression,
      $.delayed_assignment,
      $.call_expression,
      $.action_block,
      $.block_expression,
    ),
    binary_expression: $ => choice(
      prec.left(PREC.ADD, seq(
        field('left', $._expression),
        '+',
        field('right', $._expression),
      )),
      prec.left(PREC.COMPARE, seq(
        field('left', $._expression),
        choice('>', '>='),
        field('right', $._expression),
      )),
    ),
    delayed_assignment: $ => prec.right(PREC.ASSIGN, seq(
      field('name', $.identifier),
      "'",
      '=',
      field('value', $._expression),
    )),
    call_expression: $ => prec(PREC.POSTFIX, seq(
      field('function', choice($.identifier, $.type_identifier)),
      field('arguments', $.argument_list),
    )),
    argument_list: $ => seq(
      '(',
      optional(seq(
        $._expression,
        repeat(seq(',', $._expression)),
        optional(','),
      )),
      ')',
    ),
    action_block: $ => seq(
      'all',
      '{',
      field('body', $._expression),
      '}',
    ),
    block_expression: $ => seq(
      '{',
      field('body', choice($.declaration_expression, $._expression)),
      '}',
    ),
    declaration_expression: $ => prec.right(PREC.BLOCK, seq(
      field('declaration', $.operator_definition),
      field('body', $._expression),
    )),
    identifier: _ => /[a-z][A-Za-z0-9_]*|_[A-Za-z0-9_]+/,
    type_identifier: _ => /[A-Z][A-Za-z0-9_]*/,
    qualified_name: $ => seq(
      choice($.identifier, $.type_identifier),
      repeat(seq('::', choice($.identifier, $.type_identifier))),
    ),
    integer: _ => token(choice(
      /0x[0-9A-Fa-f](?:_?[0-9A-Fa-f])*/,
      /0|[1-9](?:_?[0-9])*/,
    )),
    string: _ => token(seq('"', repeat(/[^"\n]/), '"')),
    boolean: _ => choice('true', 'false'),
    comment: _ => token(choice(
      seq('///', /[^\n]*/),
      seq('//', /[^\n]*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    )),
  },
})
