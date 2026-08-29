module Destructuring {
  val pair = (1, 2)
  val (left, right) = pair
  val { name, count } = { name: "quint", count: 5 }

  pure def sumPair(input) = {
    pure val (first, second) = input
    first + second
  }
}
