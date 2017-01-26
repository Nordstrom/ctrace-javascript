'use strict'

require('should')

const Tracer = require('../')
const Stream = require('./util/stream.js')
const parse = JSON.parse

describe('originating span', () => {
  let stream, buf, tracer, timestamp, span, traceId, spanId, startTime, logTime
    // span.log({event: 'log-event'})
    // span.finish()

  before(() => {
    stream = new Stream()
    buf = stream.buf
    tracer = new Tracer({stream})
    timestamp = Date.now()
  })

  it('should start', () => {
    span = tracer.startSpan('originating')

    const rec = parse(buf[0])
    traceId = rec.traceId
    spanId = rec.spanId
    startTime = rec.start
    logTime = rec.log.timestamp

    traceId.should.match(/[a-z0-9]{16}/)
    spanId.should.match(/[a-z0-9_-]{16}/)
    startTime.should.be.aboveOrEqual(timestamp)
    logTime.should.be.aboveOrEqual(startTime)

    buf.should.have.length(1)
    parse(buf[0]).should.eql({
      traceId: traceId,
      spanId: spanId,
      operation: 'originating',
      start: startTime,
      log: {event: 'Start-Span', timestamp: logTime}
    })
  })

  it('should log', () => {
    span.log({event: 'log-event'})
    parse(buf[1]).log.timestamp.should.be.aboveOrEqual(logTime)
    logTime = parse(buf[1]).log.timestamp
    buf.should.have.length(2)
    parse(buf[1]).should.eql({
      traceId: traceId,
      spanId: spanId,
      operation: 'originating',
      start: startTime,
      log: {event: 'log-event', timestamp: logTime}
    })
  })

  it('should inject headers', () => {
    const headers = {}
    tracer.inject({traceId: 'abc', spanId: 'def'}, Tracer.FORMAT_HTTP_HEADERS, headers)
    headers.should.eql({
      'X-Request-ID': 'def',
      'X-Correlation-ID': 'abc'
    })
  })

  it('should finish', () => {
    span.finish()
    parse(buf[2]).log.timestamp.should.be.aboveOrEqual(logTime)
    logTime = parse(buf[2]).log.timestamp
    buf.should.have.length(3)
    parse(buf[2]).should.eql({
      traceId: traceId,
      spanId: spanId,
      operation: 'originating',
      start: startTime,
      duration: (logTime - startTime),
      log: {event: 'Finish-Span', timestamp: logTime}
    })
  })
})
