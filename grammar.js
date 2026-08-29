const PREC = {
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
    operator_definition: $ => seq(
      field('qualifier', $.operator_qualifier),
      field('name', $.identifier),
      optional(field('parameters', $.parameter_list)),
      optional(seq(':', field('type', $._type))),
      optional(seq('=', field('body', $._expression))),
      optional(';'),
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
    parameter_list: $ => seq(
      '(',
      optional(seq(
        $.parameter,
        repeat(seq(',', $.parameter)),
        optional(','),
      )),
      ')',
    ),
    parameter: $ => seq(
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
    ),
    _type: $ => $.primitive_type,
    primitive_type: _ => 'int',
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
