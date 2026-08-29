module.exports = grammar({
  name: 'quint',

  extras: $ => [/\s/, $.comment],

  word: $ => $.identifier,

  rules: {
    source_file: $ => repeat($.module),
    module: $ => seq(
      'module',
      field('name', $.identifier),
      '{',
      field('body', repeat($.comment)),
      '}',
    ),
    identifier: _ => /[A-Za-z_][A-Za-z0-9_]*/,
    comment: _ => token(choice(seq('//', /.*/), seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'))),
  },
})
