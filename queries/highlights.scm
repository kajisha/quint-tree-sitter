; Literals and comments

(comment) @comment
(string) @string
(integer) @number
(boolean) @boolean
(primitive_type) @type.builtin

; Structurally known declarations and call sites

(module
  name: (_) @module)

(type_declaration
  name: (qualified_name) @type)

(named_type) @type

(sum_variant
  name: (_) @constructor)

(variant_pattern
  name: (_) @constructor)

(const_declaration
  name: (_) @constant)

(var_declaration
  name: (_) @variable)

(operator_definition
  name: (_) @function)

(parameter
  name: (_) @variable.parameter)

(call_expression
  function: (_) @function)

(ufcs_expression
  function: (_) @function)

; Keywords, scoped to the CST forms in which they are syntax.

(module "module" @keyword)
(const_declaration "const" @keyword)
(var_declaration "var" @keyword)
(assume_declaration "assume" @keyword)
(type_declaration "type" @keyword)

(operator_qualifier
  [
    "val"
    "def"
    "pure"
    "action"
    "run"
    "temporal"
    "nondet"
  ] @keyword)

(import_declaration
  ["import" "from" "as"] @keyword)

(export_declaration
  ["export" "as"] @keyword)

(instance_declaration
  ["import" "from" "as"] @keyword)

(conditional_expression
  ["if" "else"] @keyword)

(match_expression "match" @keyword)

(action_block
  ["all" "any"] @keyword)

; Operators, scoped to expressions, types, and declarations so punctuation
; with another syntactic role (for example an import wildcard) is not captured.

(unary_expression "-" @operator)

(binary_expression
  [
    "^"
    "*"
    "/"
    "%"
    "+"
    "-"
    ">"
    "<"
    ">="
    "<="
    "!="
    "=="
    "and"
    "or"
    "iff"
    "leadsTo"
    "implies"
  ] @operator)

(logical_block
  ["and" "or"] @operator)

(pair_expression "->" @operator)
(function_type "->" @operator)
(operator_type "=>" @operator)
(lambda_expression "=>" @operator)
(match_arm "=>" @operator)

(delayed_assignment
  ["'" "="] @operator)

(assume_declaration "=" @operator)
(operator_definition "=" @operator)
(type_declaration "=" @operator)
(instance_override "=" @operator)

(sum_type "|" @operator)
(match_expression "|" @operator)
