'use strict'

const encoder = require('../lib/encoder.js')
require('should')

describe('encoder', () => {
  it('should encode full span', () => {
    let buffer = new Buffer(1024)
    let encoded = encoder.encode({
      traceId: 'abc',
      spanId: 'def',
      parentId: 'ghi',
      operation: 'op1',
      start: 1489522409134,
      duration: 123,
      tags: {
        tag1: 'val1',
        tag2: 'val2'
      },
      logs: [{
        timestamp: 1489522409135,
        event: 'event1'
      }],
      baggage: {
        bag1: 'val1',
        bag2: 'val2'
      }
    }, buffer)

    encoded.should.equal(
      '{"traceId":"abc","spanId":"def","parentId":"ghi","operation":"op1",' +
      '"start":1489522409134,"duration":123,"tags":{"tag1":"val1","tag2":"val2"},' +
      '"logs":[{"timestamp":1489522409135,"event":"event1"}],' +
      '"baggage":{"bag1":"val1","bag2":"val2"}}'
    )
  })
})
