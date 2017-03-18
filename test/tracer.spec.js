'use strict'

require('should')

const opentracing = require('opentracing')
const Tracer = require('../')
const Stream = require('./util/stream.js')

describe('tracer', () => {
  let stream, buf, tracer, timestamp

  beforeEach(() => {
    stream = new Stream()
    buf = stream.buf
    timestamp = Date.now()
  })

  describe('with single-event mode', () => {
    beforeEach(() => {
      opentracing.initGlobalTracer(new Tracer({stream}))
      tracer = opentracing.globalTracer()
    })

    it('should start originating span', () => {
      let span = tracer.startSpan('originating')
      let fields = span._fields

      fields.traceId.should.match(/[a-z0-9]{16}/)
      fields.spanId.should.match(/[a-z0-9_-]{16}/)
      fields.start.should.be.aboveOrEqual(timestamp)
      fields.operation.should.equal('originating')
      fields.logs[0].timestamp.should.be.aboveOrEqual(fields.start)
      fields.logs[0].event.should.equal('Start-Span')

      span._tracer.should.not.be.empty()
    })

    it('should start originating span with baggage and tags', () => {
      let span = tracer.startSpan('originating', {
        tags: {tag1: 'val1'},
        baggage: {bag1: 'val2'}
      })
      let fields = span._fields
      fields.tags.tag1.should.equal('val1')
      fields.baggage.bag1.should.equal('val2')
    })

    it('should not output on start span', () => {
      tracer.startSpan('no-output')
      buf.should.be.empty()
    })

    it('should inject headers', () => {
      const headers = {}
      const ctx = {
        traceId: 'abc',
        spanId: 'def',
        baggage: {
          bag1: 'val1',
          'bag-n2': 'val2'
        }
      }
      tracer.inject(ctx, opentracing.FORMAT_HTTP_HEADERS, headers)
      headers.should.eql({
        'ct-trace-id': 'abc',
        'ct-span-id': 'def',
        'ct-bag-bag1': 'val1',
        'ct-bag-bag-n2': 'val2'
      })
    })

    it('should inject text', () => {
      const textMap = {}
      const ctx = {
        traceId: 'abc',
        spanId: 'def',
        baggage: {
          bag1: 'val1',
          'bag-n2': 'val2'
        }
      }
      tracer.inject(ctx, opentracing.FORMAT_TEXT_MAP, textMap)
      textMap.should.eql({
        'ct-trace-id': 'abc',
        'ct-span-id': 'def',
        'ct-bag-bag1': 'val1',
        'ct-bag-bag-n2': 'val2'
      })
    })

    it('should extract headers', () => {
      const headers = {
        'ct-trace-id': 'abc',
        'ct-span-id': 'def',
        'ct-bag-bag1': 'val1',
        'ct-bag-bag-n2': 'val2'
      }
      const ctx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, headers)
      ctx.should.eql({
        traceId: 'abc',
        spanId: 'def',
        baggage: {
          bag1: 'val1',
          'bag-n2': 'val2'
        }
      })
    })

    it('should extract text', () => {
      const textMap = {
        'ct-trace-id': 'abc',
        'ct-span-id': 'def',
        'ct-bag-bag1': 'val1',
        'ct-bag-bag-n2': 'val2'
      }
      const ctx = tracer.extract(opentracing.FORMAT_TEXT_MAP, textMap)
      ctx.should.eql({
        traceId: 'abc',
        spanId: 'def',
        baggage: {
          bag1: 'val1',
          'bag-n2': 'val2'
        }
      })
    })
  })

  describe('with multi-event mode', () => {
    beforeEach(() => {
      opentracing.initGlobalTracer(new Tracer({stream, multiEvent: true}))
      tracer = opentracing.globalTracer()
    })

    it('should output started originating span', () => {
      let span = tracer.startSpan('originating')
      let rec = JSON.parse(buf[0])
      let fields = span._fields

      rec.traceId.should.equal(fields.traceId)
      rec.spanId.should.equal(fields.spanId)
      rec.start.should.equal(fields.start)
      rec.operation.should.equal('originating')
      rec.logs[0].timestamp.should.equal(fields.logs[0].timestamp)
      rec.logs[0].event.should.equal('Start-Span')
    })

    it('should start child span', () => {
      let parent = tracer.startSpan('parent')
      let span = tracer.startSpan('child', {childOf: parent})

      span._fields.parentId.should.equal(parent._fields.spanId)
      span._fields.traceId.should.equal(parent._fields.traceId)
      span._fields.spanId.should.match(/[a-z0-9]{16}/)
    })

    it('should start child span with parent baggage', () => {
      let parent = tracer.startSpan('parent')
      parent.setBaggageItem('bag1', 'val1')
      let span = tracer.startSpan('child', {childOf: parent})

      span._fields.parentId.should.equal(parent._fields.spanId)
      span._fields.traceId.should.equal(parent._fields.traceId)
      span._fields.spanId.should.match(/[a-z0-9]{16}/)
      span._fields.baggage.bag1.should.equal('val1')
    })

    it('should output started child span', () => {
      let parent = tracer.startSpan('parent')
      let span = tracer.startSpan('child', {childOf: parent})

      let rec = JSON.parse(buf[1])
      rec.parentId.should.equal(span._fields.parentId)
      rec.traceId.should.equal(span._fields.traceId)
      rec.spanId.should.equal(span._fields.spanId)
    })
  })
})
