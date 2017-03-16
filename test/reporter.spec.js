'use strict'

require('should')

const Reporter = require('../lib/reporter.js')
const encoder = require('../lib/encoder.js')
const Stream = require('./util/stream.js')

describe('reporter', () => {
  let stream, buf, reporter

  before(() => {
    stream = new Stream()
    buf = stream.buf
    reporter = new Reporter(encoder, stream)
  })

  it('should report span', () => {
    reporter.report({
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
      logs: [
        {timestamp: 1489522409134, event: 'Start-Span'},
        {timestamp: 1489522409135, event: 'Finish-Span'}
      ]
    })

    buf[0].should.equal(
      '{"traceId":"abc","spanId":"def","parentId":"ghi","operation":"op1",' +
      '"start":1489522409134000,"duration":123,' +
      '"tags":{"tag1":"val1","tag2":"val2"},' +
      '"logs":[{"timestamp":1489522409134000,"event":"Start-Span"},' +
      '{"timestamp":1489522409135000,"event":"Finish-Span"}]}'
    )
  })
})
