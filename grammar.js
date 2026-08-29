module.exports = grammar({
  name: 'quint',

  extras: $ => [/\s/, $.comment],

  word: $ => $.identifier,

  rules: {
    source_file: $ => seq(optional($.hash_bang_line), repeat($.module)),
    module: $ => seq(
      'module',
      field('name', choice($.identifier, $.type_identifier)),
      '{',
      field('body', repeat($._declaration)),
      '}',
    ),
    _declaration: $ => $.operator_definition,
    operator_definition: $ => seq(
      'val',
      field('name', $.identifier),
      '=',
      field('value', choice($.integer, $.string, $.boolean)),
      optional(';'),
    ),
    identifier: _ => /[a-z][A-Za-z0-9_]*|_[A-Za-z0-9_]+/,
    type_identifier: _ => /[A-Z][A-Za-z0-9_]*/,
    integer: _ => token(choice(
      /0x[0-9A-Fa-f](?:_?[0-9A-Fa-f])*/,
      /0|[1-9](?:_?[0-9])*/,
    )),
    string: _ => token(seq('"', repeat(/[^"\n]/), '"')),
    boolean: _ => choice('true', 'false'),
    hash_bang_line: _ => token(seq('#!', /[^\n]*/)),
    comment: _ => token(choice(
      seq('///', /[^\n]*/),
      seq('//', /[^\n]*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    )),
  },
})
