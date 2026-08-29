module Highlights {
// <- keyword
//     ^^^^^^^^^^ module

type Maybe[a] = | None | Some(a)
// <- keyword
//   ^^^^^ type
//                ^^^^ constructor
//                       ^^^^ constructor

const limit: int
// <- keyword
//    ^^^^^ constant
//           ^^^ type.builtin

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
//           ^^^ function.call
//               ^^ number
//                   ^^^^ boolean

val text = "quint"
// <- keyword
//           ^^^^^^^ string

// highlighted comment
// <- comment

val constructorLikeReference = Some
// Syntactically indistinguishable references intentionally have no semantic assertion.
val valueReference = result
}
