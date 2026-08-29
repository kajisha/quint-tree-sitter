module FixtureLibrary {
  type Result[a, e] = | Ok(a) | Err(e)
  type Metadata[r] = { name: str, labels: Set[str] | r }

  const LIMIT: int
  var counter: int

  pure def unwrap(result) = match result {
    | Ok(value) => value
    | Err(_) => 0
  }

  action init = counter' = 0
  action increment = all {
    counter < LIMIT,
    counter' = counter + 1,
  }
  temporal progress = counter < LIMIT leadsTo counter >= LIMIT
}

module Comprehensive {
  import FixtureLibrary.*

  type Entry = { key: str, value: Result[(int, str), Set[str]] }
  type Pipeline = (List[Entry], int -> str) => Set[Result[int, str]]

  val pair = (1, 2)
  val (left, right) = pair
  val record = { name: "fixture", count: left + right }
  val { name, count } = record
  val collection = Set(1, 2, 3).map(value => value + count)
  val accessed = { values: [left, right] }.values[0]
  val matched = unwrap(Ok(accessed))

  pure def summarize(input) = {
    pure val (first, second) = input
    first + second * 2
  }

  action step = any { init, increment }
  temporal safety = always(counter >= 0)
}
