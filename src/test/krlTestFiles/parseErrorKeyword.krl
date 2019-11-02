ruleset test {
  meta {
    shares __testing
  }
  global {
    __testing = { "queries":
      [ { "name": "__testing" }
      //, { "name": "entry", "args": [ "key" ] }
      ] , "events":
      [ { "domain": "d1", "type": "t1" }
      //, { "domain": "d2", "type": "t2", "attrs": [ "a1", "a2" ] }
      ]
    }
  }
  rule a {
    select when d1 t1
    pre {
    }
    aways {
      schedule notification event "remind5" at time:add(time:now(), {"minutes": 5})
    }
  }
}
