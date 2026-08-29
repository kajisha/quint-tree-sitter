module SumAndMatch {
  type Result[a, e] = | Ok(a) | Err(e)

  def unwrap(result) = match result {
    | Ok(value) => value
    | Err(_) => 0
    | _ => -1
  }
}
