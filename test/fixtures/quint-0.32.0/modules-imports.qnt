module Library {
  const Limit: int
  val identity(value) = value
}

module Consumer {
  import Library
  import Library.identity
  import Library.*
  import Library as Lib
  import Library.* from "./library"
  import Library(Limit = 10) as Configured
  export Library.*
}
