module ActionsAndTemporal {
  var counter: int

  action init = counter' = 0
  action increment = all {
    counter >= 0,
    counter' = counter + 1,
  }
  action step = any { init, increment }

  temporal nonnegative = always(counter >= 0)
  temporal progress = counter < 10 leadsTo counter >= 10
}
