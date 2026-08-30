const PREC = {
  TYPE_OPERATOR: 1,
  TYPE_FUNCTION: 2,
  PAIR: 1,
  BLOCK: 2,
  IMPLIES: 3,
  LEADS_TO: 4,
  IFF: 5,
  OR: 6,
  AND: 7,
  ASSIGN: 8,
  COMPARE: 9,
  ADD: 10,
  MULTIPLY: 11,
  UNARY: 12,
  POWER: 13,
  POSTFIX: 14,
}

module.exports = grammar({
  name: 'quint',

  extras: $ => [/\s/, $.comment],

  externals: $ => [$.hash_bang_line, $._file_start],

  conflicts: $ => [
    [$.tuple_type, $.operator_type],
    // `(x, y)` is a tuple until a following `=>` makes it a lambda parameter list.
    [$._expression_name, $._lambda_name_component],
    // `Math::x` remains an expression unless a following `=>` makes it a parameter.
    [$._qualified_expression_name, $._lambda_name_component],
    // `((x, y)) =>` is Quint's tuple-parameter sugar, not a grouped tuple value.
    [$.tuple_parameter],
    [$._primary_expression, $._call_name],
    [$._call_name, $._identifier_component],
    [$.ufcs_expression, $.field_access_expression],
    [$._complete_local_operator_definition, $._local_operator_definition_header],
  ],

  word: $ => $.identifier,

  reserved: {
    global: _ => [
      'module', 'const', 'var', 'assume', 'val', 'pure', 'def', 'action', 'run',
      'temporal', 'nondet', 'type', 'import', 'export', 'bool', 'int', 'str',
      'if', 'else', 'match', 'and', 'or', 'iff', 'implies', 'leadsTo', 'all',
      'any', 'true', 'false',
    ],
    pattern: _ => [
      'module', 'const', 'var', 'assume', 'val', 'pure', 'def', 'action', 'run',
      'temporal', 'nondet', 'type', 'import', 'export', 'bool', 'int', 'str',
      'if', 'else', 'match', 'and', 'or', 'iff', 'implies', 'leadsTo', 'all',
      'any', 'true', 'false',
    ],
  },

  rules: {
    source_file: $ => seq(choice($.hash_bang_line, $._file_start), repeat($.module)),
    module: $ => seq(
      'module',
      field('name', choice(
        $.identifier,
        $.type_identifier,
        alias(choice('from', 'as'), $.identifier),
        alias(choice('Set', 'List'), $.type_identifier),
        alias($._strict_qualified_name, $.qualified_name),
      )),
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
      field('name', $._qual_id),
      ':',
      field('type', $._type),
      optional(';'),
    ),
    var_declaration: $ => seq(
      'var',
      field('name', $._qual_id),
      ':',
      field('type', $._type),
      optional(';'),
    ),
    assume_declaration: $ => seq(
      'assume',
      field('name', $._ident_or_hole),
      '=',
      field('value', $._expression),
      optional(';'),
    ),
    operator_definition: $ => choice(
      prec(1, seq(
        field('qualifier', $.operator_qualifier),
        field('name', $._normal_call_name),
        optional(field('parameters', alias($._untyped_parameter_list, $.parameter_list))),
        optional(seq(':', field('type', $._type))),
        '=',
        field('body', $._primary_expression),
        optional(';'),
      )),
      seq(
        field('qualifier', alias($._destructuring_qualifier, $.operator_qualifier)),
        field('pattern', choice($.tuple_pattern, $.record_pattern)),
        '=',
        field('body', $._expression),
        optional(';'),
      ),
      seq(
        field('qualifier', $.operator_qualifier),
        field('name', $._normal_call_name),
        field('parameters', alias($._annotated_parameter_list, $.parameter_list)),
        ':',
        field('type', $._type),
        optional(seq('=', field('body', $._expression))),
        optional(';'),
      ),
      seq(
        field('qualifier', $.operator_qualifier),
        field('name', $._normal_call_name),
        optional(field('parameters', alias($._untyped_parameter_list, $.parameter_list))),
        optional(seq(':', field('type', $._type))),
        optional(seq('=', field('body', $._expression))),
        optional(';'),
      ),
    ),
    _destructuring_qualifier: _ => choice(
      'val',
      seq('pure', 'val'),
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
      field('name', $._ident_or_hole),
      ':',
      field('type', $._type),
    ),
    _untyped_parameter: $ => field('name', $._ident_or_hole),
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
    hole: _ => '_',
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
    sum_type: $ => prec.dynamic(1, seq(
      optional('|'),
      $.sum_variant,
      repeat(seq('|', $.sum_variant)),
    )),
    sum_variant: $ => prec(1, seq(
      field('name', choice($.identifier, $.type_identifier)),
      optional(seq('(', field('type', $._type), ')')),
    )),
    _expression: $ => prec.left(choice(
      $.declaration_expression,
      $.lambda_expression,
      $._pair_level,
    )),
    _primary_expression: $ => choice(
      $._expression_name,
      $.integer,
      $.string,
      $.boolean,
      $.unit_expression,
      $.parenthesized_expression,
      $.tuple_expression,
      $.list_expression,
      $.record_expression,
      $.conditional_expression,
      $.match_expression,
      $.call_expression,
      $.logical_block,
      $.action_block,
      $.block_expression,
    ),
    _expression_name: $ => choice(
      $._identifier_component,
      alias($._qualified_expression_name, $.qualified_name),
    ),
    _qualified_expression_name: $ => seq(
      $._identifier_component,
      repeat1(seq('::', $._identifier_component)),
    ),
    unit_expression: _ => seq('(', ')'),
    parenthesized_expression: $ => seq('(', $._expression, ')'),
    tuple_expression: $ => seq(
      '(',
      field('element', $._expression),
      ',',
      field('element', $._expression),
      repeat(seq(',', field('element', $._expression))),
      optional(','),
      ')',
    ),
    list_expression: $ => seq(
      '[',
      optional(seq(
        field('element', $._expression),
        repeat(seq(',', field('element', $._expression))),
        optional(','),
      )),
      ']',
    ),
    record_expression: $ => seq(
      '{',
      $.record_element,
      repeat(seq(',', $.record_element)),
      optional(','),
      '}',
    ),
    record_element: $ => choice(
      seq(
        field('name', $._identifier_component),
        ':',
        field('value', $._expression),
      ),
      seq('...', field('value', $._expression)),
    ),
    conditional_expression: $ => seq(
      'if',
      '(',
      field('condition', $._expression),
      ')',
      field('consequence', $._expression),
      'else',
      field('alternative', $._expression),
    ),
    match_expression: $ => seq(
      'match',
      field('value', $._expression),
      '{',
      optional('|'),
      field('arm', $.match_arm),
      repeat(seq('|', field('arm', $.match_arm))),
      '}',
    ),
    match_arm: $ => seq(
      field('pattern', choice($.variant_pattern, $._wildcard_pattern)),
      '=>',
      field('body', $._expression),
    ),
    _pattern: $ => choice(
      $.identifier_pattern,
      $._wildcard_pattern,
      $.tuple_pattern,
      $.record_pattern,
      $.variant_pattern,
    ),
    identifier_pattern: $ => field('name', $._pattern_identifier),
    _wildcard_pattern: $ => alias($.hole, $.wildcard_pattern),
    tuple_pattern: $ => seq(
      '(',
      field('element', choice($.identifier_pattern, $._wildcard_pattern)),
      ',',
      field('element', choice($.identifier_pattern, $._wildcard_pattern)),
      repeat(seq(',', field('element', choice($.identifier_pattern, $._wildcard_pattern)))),
      ')',
    ),
    record_pattern: $ => seq(
      '{',
      field('field', $.identifier_pattern),
      repeat(seq(',', field('field', $.identifier_pattern))),
      '}',
    ),
    variant_pattern: $ => seq(
      field('name', $._pattern_identifier),
      optional(seq(
        '(',
        field('argument', choice($.identifier_pattern, $._wildcard_pattern)),
        ')',
      )),
    ),
    _pattern_identifier: $ => choice(
      reserved('pattern', $.identifier),
      $.type_identifier,
      alias(choice('from', 'as'), $.identifier),
      alias(choice('Set', 'List'), $.type_identifier),
    ),
    lambda_expression: $ => choice(
      seq(
        field('parameter', alias($._lambda_parameter, $.parameter)),
        '=>',
        field('body', $._expression),
      ),
      seq(
        field('parameters', alias($._lambda_parameter_list, $.parameter_list)),
        '=>',
        field('body', $._expression),
      ),
      seq(
        field('parameters', $.tuple_parameter),
        '=>',
        field('body', $._expression),
      ),
    ),
    _lambda_parameter: $ => field('name', choice(
      $._lambda_name_component,
      alias($._lambda_qualified_name, $.qualified_name),
      $.hole,
    )),
    _lambda_name_component: $ => choice(
      $._identifier_component,
    ),
    _lambda_qualified_name: $ => seq(
      $._lambda_name_component,
      repeat1(seq('::', $._lambda_name_component)),
    ),
    _lambda_parameter_list: $ => seq(
      '(',
      alias($._lambda_parameter, $.parameter),
      repeat(seq(',', alias($._lambda_parameter, $.parameter))),
      ')',
    ),
    tuple_parameter: $ => seq(
      '(',
      '(',
      alias($._lambda_parameter, $.parameter),
      ',',
      alias($._lambda_parameter, $.parameter),
      repeat(seq(',', alias($._lambda_parameter, $.parameter))),
      ')',
      ')',
    ),
    unary_expression: $ => seq(
      '-',
      field('operand', choice($._unary_level, $.declaration_expression, $.lambda_expression)),
    ),
    binary_expression: $ => prec.right(seq(
      field('left', $._postfix_expression),
      '^',
      field('right', choice($._unary_level, $.declaration_expression, $.lambda_expression)),
    )),
    _pair_level: $ => prec.left(choice(
      $._implies_level,
      $.pair_expression,
    )),
    _implies_level: $ => prec.left(choice(
      $._leads_level,
      alias($._implies_binary, $.binary_expression),
    )),
    _implies_binary: $ => prec.left(seq(
      field('left', $._implies_level),
      'implies',
      field('right', choice($._leads_level, $.declaration_expression, $.lambda_expression)),
    )),
    _leads_level: $ => prec.left(choice(
      $._iff_level,
      alias($._leads_binary, $.binary_expression),
    )),
    _leads_binary: $ => prec.left(seq(
      field('left', $._leads_level),
      'leadsTo',
      field('right', choice($._iff_level, $.declaration_expression, $.lambda_expression)),
    )),
    _iff_level: $ => prec.left(choice(
      $._or_level,
      alias($._iff_binary, $.binary_expression),
    )),
    _iff_binary: $ => prec.left(seq(
      field('left', $._iff_level),
      'iff',
      field('right', choice($._or_level, $.declaration_expression, $.lambda_expression)),
    )),
    _or_level: $ => prec.left(choice(
      $._and_level,
      alias($._or_binary, $.binary_expression),
    )),
    _or_binary: $ => prec.left(seq(
      field('left', $._or_level),
      'or',
      field('right', choice($._and_level, $.declaration_expression, $.lambda_expression)),
    )),
    _and_level: $ => prec.left(choice(
      $._assignment_level,
      alias($._and_binary, $.binary_expression),
    )),
    _and_binary: $ => prec.left(seq(
      field('left', $._and_level),
      'and',
      field('right', choice($._assignment_level, $.declaration_expression, $.lambda_expression)),
    )),
    _assignment_level: $ => prec.right(choice(
      $._compare_level,
      $.delayed_assignment,
    )),
    _compare_level: $ => prec.left(choice(
      $._add_level,
      alias($._compare_binary, $.binary_expression),
    )),
    _compare_binary: $ => prec.left(PREC.COMPARE, seq(
      field('left', $._compare_level),
      choice('>', '<', '>=', '<=', '!=', '=='),
      field('right', choice($._add_level, $.declaration_expression, $.lambda_expression)),
    )),
    _add_level: $ => prec.left(choice(
      $._multiply_level,
      alias($._add_binary, $.binary_expression),
    )),
    _add_binary: $ => prec.left(PREC.ADD, seq(
      field('left', $._add_level),
      choice('+', '-'),
      field('right', choice($._multiply_level, $.declaration_expression, $.lambda_expression)),
    )),
    _multiply_level: $ => prec.left(choice(
      $._unary_level,
      alias($._multiply_binary, $.binary_expression),
    )),
    _multiply_binary: $ => prec.left(PREC.MULTIPLY, seq(
      field('left', $._multiply_level),
      choice('*', '/', '%'),
      field('right', choice($._unary_level, $.declaration_expression, $.lambda_expression)),
    )),
    _unary_level: $ => prec.right(choice(
      $._power_level,
      $.unary_expression,
    )),
    _power_level: $ => prec.right(choice(
      $._postfix_expression,
      $.binary_expression,
    )),
    _postfix_expression: $ => prec.left(choice(
      $._primary_expression,
      $.ufcs_expression,
      $.field_access_expression,
      $.index_expression,
    )),
    pair_expression: $ => prec.left(seq(
      field('key', $._pair_level),
      '->',
      field('value', choice($._implies_level, $.declaration_expression, $.lambda_expression)),
    )),
    delayed_assignment: $ => prec.right(PREC.ASSIGN, seq(
      field('name', $._expression_name),
      "'",
      '=',
      field('value', choice($._assignment_level, $.declaration_expression, $.lambda_expression)),
    )),
    call_expression: $ => prec.dynamic(-1, prec(PREC.POSTFIX, seq(
      field('function', $._call_name),
      field('arguments', $.argument_list),
    ))),
    _call_name: $ => choice(
      $._expression_name,
      alias(choice('and', 'or', 'iff', 'implies', 'leadsTo'), $.identifier),
      alias(choice('Set', 'List'), $.type_identifier),
    ),
    _member_name: $ => choice(
      $._expression_name,
      alias(choice('and', 'or', 'iff', 'implies', 'leadsTo'), $.identifier),
    ),
    ufcs_expression: $ => prec.dynamic(1, prec.left(PREC.POSTFIX, seq(
      field('receiver', choice($._postfix_expression, $.lambda_expression, $.declaration_expression)),
      '.',
      field('function', $._member_name),
      field('arguments', $.argument_list),
    ))),
    field_access_expression: $ => prec(PREC.POSTFIX, seq(
      field('receiver', choice($._postfix_expression, $.lambda_expression, $.declaration_expression)),
      '.',
      field('field', $._member_name),
    )),
    index_expression: $ => prec.left(PREC.POSTFIX, seq(
      field('collection', choice($._postfix_expression, $.lambda_expression, $.declaration_expression)),
      '[',
      field('index', $._expression),
      ']',
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
    logical_block: $ => seq(
      choice('and', 'or'),
      '{',
      field('body', $._expression),
      repeat(seq(',', field('element', $._expression))),
      optional(','),
      '}',
    ),
    action_block: $ => seq(
      choice('all', 'any'),
      '{',
      field('body', $._expression),
      repeat(seq(',', field('element', $._expression))),
      optional(','),
      '}',
    ),
    block_expression: $ => seq(
      '{',
      field('body', $._expression),
      '}',
    ),
    declaration_expression: $ => choice(
      $._action_boundary_declaration_expression,
      prec.dynamic(1, prec.right(PREC.BLOCK, seq(
        field('declaration', alias($._local_operator_definition, $.operator_definition)),
        field('body', $._expression),
      ))),
    ),
    _action_boundary_declaration_expression: $ => choice(
      prec.right(PREC.BLOCK, seq(
        field('declaration', alias($._complete_local_operator_definition, $.operator_definition)),
        field('body', $.action_block),
      )),
      prec.right(PREC.BLOCK, seq(
        field('declaration', alias($._complete_local_operator_definition, $.operator_definition)),
        field('body', alias($._action_boundary_declaration_expression, $.declaration_expression)),
      )),
    ),
    _local_operator_definition: $ => seq(
      $._local_operator_definition_header,
      field('body', $._expression),
      optional(';'),
    ),
    _complete_local_operator_definition: $ => seq(
      $._local_named_operator_definition_header,
      field('body', $._complete_expression),
      optional(';'),
    ),
    _complete_expression: $ => prec.right(choice(
      $._complete_pair_level,
      $.lambda_expression,
      $.declaration_expression,
    )),
    _complete_pair_level: $ => prec.left(choice(
      $._complete_implies_level,
      alias($._complete_pair_expression, $.pair_expression),
    )),
    _complete_pair_expression: $ => prec.left(seq(
      field('key', $._complete_pair_level),
      '->',
      field('value', choice($._complete_implies_level, $.declaration_expression, $.lambda_expression)),
    )),
    _complete_implies_level: $ => prec.left(choice(
      $._complete_leads_level,
      alias($._complete_implies_binary, $.binary_expression),
    )),
    _complete_implies_binary: $ => prec.left(seq(
      field('left', $._complete_implies_level),
      'implies',
      field('right', choice($._complete_leads_level, $.declaration_expression, $.lambda_expression)),
    )),
    _complete_leads_level: $ => prec.left(choice(
      $._complete_iff_level,
      alias($._complete_leads_binary, $.binary_expression),
    )),
    _complete_leads_binary: $ => prec.left(seq(
      field('left', $._complete_leads_level),
      'leadsTo',
      field('right', choice($._complete_iff_level, $.declaration_expression, $.lambda_expression)),
    )),
    _complete_iff_level: $ => prec.left(choice(
      $._complete_or_level,
      alias($._complete_iff_binary, $.binary_expression),
    )),
    _complete_iff_binary: $ => prec.left(seq(
      field('left', $._complete_iff_level),
      'iff',
      field('right', choice($._complete_or_level, $.declaration_expression, $.lambda_expression)),
    )),
    _complete_or_level: $ => prec.left(choice(
      $._complete_and_level,
      alias($._complete_or_binary, $.binary_expression),
    )),
    _complete_or_binary: $ => prec.left(seq(
      field('left', $._complete_or_level),
      'or',
      field('right', choice($._complete_and_level, $.declaration_expression, $.lambda_expression)),
    )),
    _complete_and_level: $ => prec.left(choice(
      $._complete_assignment_level,
      alias($._complete_and_binary, $.binary_expression),
    )),
    _complete_and_binary: $ => prec.left(seq(
      field('left', $._complete_and_level),
      'and',
      field('right', choice($._complete_assignment_level, $.declaration_expression, $.lambda_expression)),
    )),
    _complete_assignment_level: $ => prec.right(choice(
      $._complete_compare_level,
      alias($._complete_delayed_assignment, $.delayed_assignment),
    )),
    _complete_compare_level: $ => prec.left(choice(
      $._complete_add_level,
      alias($._complete_compare_binary, $.binary_expression),
    )),
    _complete_compare_binary: $ => prec.left(PREC.COMPARE, seq(
      field('left', $._complete_compare_level),
      choice('>', '<', '>=', '<=', '!=', '=='),
      field('right', choice($._complete_add_level, $.declaration_expression, $.lambda_expression)),
    )),
    _complete_add_level: $ => prec.left(choice(
      $._complete_multiply_level,
      alias($._complete_add_binary, $.binary_expression),
    )),
    _complete_add_binary: $ => prec.left(PREC.ADD, seq(
      field('left', $._complete_add_level),
      choice('+', '-'),
      field('right', choice($._complete_multiply_level, $.declaration_expression, $.lambda_expression)),
    )),
    _complete_multiply_level: $ => prec.left(choice(
      $._complete_unary_level,
      alias($._complete_multiply_binary, $.binary_expression),
    )),
    _complete_multiply_binary: $ => prec.left(PREC.MULTIPLY, seq(
      field('left', $._complete_multiply_level),
      choice('*', '/', '%'),
      field('right', choice($._complete_unary_level, $.declaration_expression, $.lambda_expression)),
    )),
    _complete_unary_level: $ => prec.right(choice(
      $._complete_power_level,
      alias($._complete_unary_expression, $.unary_expression),
    )),
    _complete_unary_expression: $ => seq(
      '-',
      field('operand', choice($._complete_unary_level, $.declaration_expression, $.lambda_expression)),
    ),
    _complete_power_level: $ => prec.right(choice(
      $._postfix_expression,
      alias($._complete_power_binary, $.binary_expression),
    )),
    _complete_power_binary: $ => prec.right(seq(
      field('left', $._postfix_expression),
      '^',
      field('right', choice($._complete_unary_level, $.declaration_expression, $.lambda_expression)),
    )),
    _complete_delayed_assignment: $ => prec.right(PREC.ASSIGN, seq(
      field('name', $._expression_name),
      "'",
      '=',
      field('value', choice($._complete_assignment_level, $.declaration_expression, $.lambda_expression)),
    )),
    _local_operator_definition_header: $ => choice(
      $._local_destructuring_operator_definition_header,
      $._local_named_operator_definition_header,
    ),
    _local_destructuring_operator_definition_header: $ => seq(
      field('qualifier', alias($._destructuring_qualifier, $.operator_qualifier)),
      field('pattern', choice($.tuple_pattern, $.record_pattern)),
      '=',
    ),
    _local_named_operator_definition_header: $ => choice(
      seq(
        field('qualifier', $.operator_qualifier),
        field('name', $._normal_call_name),
        field('parameters', alias($._annotated_parameter_list, $.parameter_list)),
        ':',
        field('type', $._type),
        '=',
      ),
      seq(
        field('qualifier', $.operator_qualifier),
        field('name', $._normal_call_name),
        optional(field('parameters', alias($._untyped_parameter_list, $.parameter_list))),
        optional(seq(':', field('type', $._type))),
        '=',
      ),
    ),
    identifier: _ => /[a-z][A-Za-z0-9_]*|_[A-Za-z0-9_]+/,
    type_identifier: _ => /[A-Z][A-Za-z0-9_]*/,
    _identifier_component: $ => choice(
      $.identifier,
      $.type_identifier,
      alias(choice('from', 'as'), $.identifier),
      alias(choice('Set', 'List'), $.type_identifier),
    ),
    _qual_id: $ => choice(
      $._identifier_component,
      alias($._strict_qualified_name, $.qualified_name),
    ),
    _strict_qualified_name: $ => seq(
      $._identifier_component,
      repeat1(seq('::', $._identifier_component)),
    ),
    _ident_or_hole: $ => choice($.hole, $._qual_id),
    _normal_call_name: $ => choice(
      $._qual_id,
      alias(choice('and', 'or', 'iff', 'implies', 'leadsTo'), $.identifier),
    ),
    qualified_name: $ => seq(
      $._identifier_component,
      repeat(seq('::', $._identifier_component)),
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
