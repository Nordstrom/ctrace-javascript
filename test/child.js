'use strict'

require('should')

const Tracer = require('../')
const Stream = require('./util/stream.js')
const parse = JSON.parse

describe('child span', () => {
  let stream, buf, tracer, timestamp, parent, traceId, parentId

  beforeEach(() => {
    stream = new Stream()
    buf = stream.buf
    tracer = new Tracer({stream, genId: 'slugid'})
    timestamp = Date.now()
    parent = tracer.startSpan('originating')
    traceId = parse(buf[0]).traceId
    parentId = parse(buf[0]).spanId
  })

  it('should start with childOf', () => {
    tracer.startSpan('child-childOf', { childOf: parent })
    const rec = parse(buf[1])
    const spanId = rec.spanId
    const startTime = rec.start
    const logTime = rec.log.timestamp

    startTime.should.be.aboveOrEqual(timestamp)
    logTime.should.be.aboveOrEqual(startTime)

    buf.should.have.length(2)
    rec.should.eql({
      traceId: traceId,
      parentId: parentId,
      spanId: spanId,
      operation: 'child-childOf',
      start: startTime,
      log: {event: 'Start-Span', timestamp: logTime}
    })
  })

  it('should start with extract standard headers', () => {
    const headers = {
      'X-Request-ID': 'abc',
      'X-Correlation-ID': 'def'
    }

    const spanContext = tracer.extract(Tracer.FORMAT_HTTP_HEADERS, headers)
    tracer.startSpan('child-extract', {childOf: spanContext})
    const rec = parse(buf[1])
    const spanId = rec.spanId
    const startTime = rec.start
    const logTime = rec.log.timestamp

    buf.should.have.length(2)
    rec.should.eql({
      traceId: 'def',
      parentId: 'abc',
      spanId: spanId,
      operation: 'child-extract',
      start: startTime,
      log: {event: 'Start-Span', timestamp: logTime}
    })
  })
})
