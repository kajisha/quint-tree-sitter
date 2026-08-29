module ComplexTypes {
  type Result[a, e] = | Ok(a) | Err(e)
  type Metadata[r] = { name: str, labels: Set[str] | r }
  type Payload = {
    entries: List[Result[(int, str), Set[str]]],
    transform: (int, str) => bool,
    lookup: str -> Result[int, str],
  }
  type Pipeline = (Payload, List[int],) => Set[Result[int, str]]
}
