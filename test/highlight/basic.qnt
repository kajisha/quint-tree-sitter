module Highlights {
// <- keyword
//     ^^^^^^^^^^ module

import Math.* from "./math"
// <- keyword
//            ^^^^ keyword
//                 ^^^^^^^^ string

import Math as M from "./math"
// <- keyword
//          ^^ keyword
//               ^^^^ keyword

export Math as M
// <- keyword
//          ^^ keyword

import Voting(Value = 1) as V from "./voting"
// <- keyword
//                  ^ operator
//                       ^^ keyword
//                            ^^^^ keyword

type Maybe[a] = | None | Some(a)
// <- keyword
//   ^^^^^ type
//            ^ operator
//              ^ operator
//                ^^^^ constructor
//                       ^^^^ constructor

const optional: Maybe[int]
//              ^^^^^ type

const limit: int
// <- keyword
//    ^^^^^ constant
//           ^^^ type.builtin

const mapper: int -> bool
//                ^^ operator

const reducer: (int, int) => int
//                        ^^ operator

var enabled: bool
// <- keyword
//  ^^^^^^^ variable
//           ^^^^ type.builtin

var counter: int
// <- keyword
//  ^^^^^^^ variable
//           ^^^ type.builtin

assume ready = true
// <- keyword
//           ^ operator
//             ^^^^ boolean

def add(x: int, y: int): int = x + y
// <- keyword
//  ^^^ function
//      ^ variable.parameter
//         ^^^ type.builtin
//              ^ variable.parameter
//                 ^^^ type.builtin
//                       ^^^ type.builtin
//                           ^ operator
//                               ^ operator

pure val pureValue = 0
// <- keyword
//   ^^^ keyword

run runner = true
// <- keyword

temporal progress = true
// <- keyword

nondet selected = true
// <- keyword

val result = add(42, true)
// <- keyword
//  ^^^^^^ function
//         ^ operator
//           ^^^ function
//               ^^ number
//                   ^^^^ boolean

val piped = result.add(1)
//                 ^^^ function

val choice = if (ready) result else 0
//           ^^ keyword
//                             ^^^^ keyword

val choices = all { ready, enabled }
//            ^^^ keyword

val conjunctions = and { ready, enabled }
//                 ^^^ operator

val alternatives = or { ready, enabled }
//                 ^^ operator

val possibilities = any { ready, enabled }
//                  ^^^ keyword

val lambda = x => -x
//             ^^ operator
//                ^ operator

val comparison = result == limit and ready implies enabled
//                      ^^ operator
//                               ^^^ operator
//                                         ^^^^^^^ operator

val power = a ^ b
//            ^ operator

val multiply = a * b
//               ^ operator

val divide = a / b
//             ^ operator

val remainder = a % b
//                ^ operator

val subtract = a - b
//               ^ operator

val greater = a > b
//              ^ operator

val less = a < b
//           ^ operator

val greaterEqual = a >= b
//                   ^^ operator

val lessEqual = a <= b
//                ^^ operator

val unequal = a != b
//              ^^ operator

val disjunction = a or b
//                  ^^ operator

val equivalence = a iff b
//                  ^^^ operator

val leads = a leadsTo b
//            ^^^^^^^ operator

val pair = "key" -> result
//               ^^ operator

action update = enabled' = false
// <- keyword
//                     ^ operator
//                       ^ operator

action increment = counter' = counter + 1
// <- keyword
//                 ^^^^^^^ variable
//                        ^ operator
//                          ^ operator
//                            ^^^^^^^ variable
//                                    ^ operator
//                                      ^ number

val matched = match constructorLikeReference { | Some(x) => x | None => 0 }
//            ^^^^^ keyword
//                                             ^ operator
//                                               ^^^^ constructor
//                                                       ^^ operator
//                                                            ^ operator
//                                                              ^^^^ constructor
//                                                                   ^^ operator

val text = "quint"
// <- keyword
//           ^^^^^^^ string

// highlighted comment
// <- comment

val constructorLikeReference = Some
// Syntactically indistinguishable references intentionally have no semantic assertion.
val valueReference = result
}
