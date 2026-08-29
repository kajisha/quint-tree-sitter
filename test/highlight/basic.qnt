module Highlights {
// <- keyword
//     ^^^^^^^^^^ module

import Math.* from "./math"
// <- keyword
//            ^^^^ keyword
//                 ^^^^^^^^ string

export Math.*
// <- keyword

type Maybe[a] = | None | Some(a)
// <- keyword
//   ^^^^^ type
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

val lambda = x => -x
//             ^^ operator
//                ^ operator

val comparison = result == limit and ready implies enabled
//                      ^^ operator
//                               ^^^ operator
//                                         ^^^^^^^ operator

val pair = "key" -> result
//               ^^ operator

action update = enabled' = false
// <- keyword
//                     ^ operator
//                       ^ operator

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
