'use strict'

const should = require('should')
const _ = require('lodash')
const tracer = require('../src')
const Stream = require('./util/stream.js')

describe('tracer', () => {
  let stream, buf, timestamp

  beforeEach(() => {
    stream = new Stream()
    buf = stream.buf
    timestamp = Date.now()
  })

  describe('with single-event mode', () => {
    beforeEach(() => {
      tracer.init({stream})
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

    it('should start originating span with tags', () => {
      let span = tracer.startSpan('originating', {
        tags: {tag1: 'val1'}
      })
      let fields = span._fields
      fields.tags.tag1.should.equal('val1')
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
      tracer.inject(ctx, tracer.FORMAT_HTTP_HEADERS, headers)
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
      tracer.inject(ctx, tracer.FORMAT_TEXT_MAP, textMap)
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
      const ctx = tracer.extract(tracer.FORMAT_HTTP_HEADERS, headers)
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
      const ctx = tracer.extract(tracer.FORMAT_TEXT_MAP, textMap)
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

  describe('with debug settings', () => {

    function createEvents (isTracerDebug, isSpanDebug) {
      tracer.init({ stream, debug: isTracerDebug })
      let span = tracer.startSpan('originating', { debug: isSpanDebug }, () => {})
      let ctx = { span:  span }

      tracer.debug(ctx, 'DebugEvent', { foo: 'bar' })
      tracer.info(ctx, 'InfoEvent', { foo: 'bar' })
      tracer.warn(ctx, 'WarnEvent', { foo: 'bar' })
      tracer.error(ctx, 'ErrorEvent', { foo: 'bar' })

      span.finish()

      let logs = stream.buf.length ? JSON.parse(stream.buf[0]).logs : []
      let debugEvent = _.omit(_.find(logs, (log) => {
        return log.level === 'debug'
      }), ['timestamp'])
      let infoEvent = _.omit(_.find(logs, (log) => {
        return log.level=== 'info'
      }), ['timestamp'])
      let warnEvent = _.omit(_.find(logs, (log) => {
        return log.level === 'warn'
      }), ['timestamp'])
      let errorEvent = _.omit(_.find(logs, (log) => {
        return log.level === 'error'
      }), ['timestamp'])

      return {
        debug: debugEvent,
        info: infoEvent,
        warn: warnEvent,
        error: errorEvent
      }
    }

    it('outputs log when span.debug is true and tracer.debug is true', () => {
      let events = createEvents(true, true)
      events.debug.should.eql({ foo: 'bar', event: 'DebugEvent', level: 'debug', debug: true })
      events.info.should.eql({ foo: 'bar', event: 'InfoEvent', level: 'info' })
      events.warn.should.eql({ foo: 'bar', event: 'WarnEvent', level: 'warn' })
      events.error.should.eql({ foo: 'bar', event: 'ErrorEvent', level: 'error', error: true })
    })

    it('does not output span when span.debug is true and tracer.debug is false', () => {
      let events = createEvents(false, true)
      events.debug.should.be.an.Object().and.be.empty()
      events.info.should.be.an.Object().and.be.empty()
      events.warn.should.be.an.Object().and.be.empty()
      events.error.should.be.an.Object().and.be.empty()
    })

    it('defaults to debug false when tracer.debug and span.debug are not set and does not log debug events', () => {
      let events = createEvents()
      events.debug.should.be.an.Object().and.be.empty()
      events.info.should.eql({ foo: 'bar', event: 'InfoEvent', level: 'info' })
      events.warn.should.eql({ foo: 'bar', event: 'WarnEvent', level: 'warn' })
      events.error.should.eql({ foo: 'bar', event: 'ErrorEvent', level: 'error', error: true })
    })

    it('should log all events when tracer.debug is true and span.debug is false', () => {
      let events = createEvents(true, false)
      events.debug.should.eql({ foo: 'bar', event: 'DebugEvent', level: 'debug', debug: true })
      events.info.should.eql({ foo: 'bar', event: 'InfoEvent', level: 'info' })
      events.warn.should.eql({ foo: 'bar', event: 'WarnEvent', level: 'warn' })
      events.error.should.eql({ foo: 'bar', event: 'ErrorEvent', level: 'error', error: true })
    })

    it.only('can update tracer.debug value on the fly', () => {
      tracer.init({ debug: false, logFn: function(text) { console.log(text)} })
      let span1 = tracer.startSpan('originating', { debug: true }, () => {})
      tracer.debug({ span: span1 }, 'Debug Log')
      span1.finish()
      let logs1 = span1._fields.logs
      let debugEvent1 = _.omit(_.find(logs1, (log) => {
        return log.level === 'debug'
      }), ['timestamp'])
      debugEvent1.should.be.an.Object().and.be.empty()

      tracer.init({ debug: true, logFn: function(text) { console.log(text)} })
      let span2 = tracer.startSpan('originating', { debug: true }, () => {})
      tracer.debug({ span: span2 }, 'Debug Log')
      span2.finish()
      let logs2 = span2._fields.logs
      let debugEvent2 = _.omit(_.find(logs2, (log) => {
        return log.level === 'debug'
      }), ['timestamp'])
      debugEvent2.should.eql({ event: 'Debug Log', level: 'debug', debug: true })
    })

  })

  describe('with custom propagators', () => {
    beforeEach(() => {
      tracer.init({
        stream,
        propagators: {
          [tracer.FORMAT_HTTP_HEADERS]: [
            {
              extract: (carrier) => {
                if (carrier['x-correlation-id']) {
                  return {
                    traceId: carrier['x-correlation-id'],
                    spanId: carrier['x-correlation-id']
                  }
                }
              }
            },
            {
              extract: (carrier) => {
                if (carrier['TraceContext']) {
                  let ctx = carrier['TraceContext'].split('|')
                  return {traceId: ctx[0], spanId: ctx[1]}
                }
              }
            }
          ],
          'fmt-custom': [
            {
              inject: (spanContext, carrier) => {
                carrier['custom-span-id'] = spanContext.spanId
                carrier['custom-trace-id'] = spanContext.traceId
              }
            },
            {
              inject: (spanContext, carrier) => {
                carrier['trace-context'] = `${spanContext.traceId}-${spanContext.spanId}`
              }
            }
          ]
        }
      })
    })

    it('should extract custom', () => {
      const headers = {'x-correlation-id': 'abcdef', 'ct-trace-id': 'xyz'}
      let ctx = tracer.extract(tracer.FORMAT_HTTP_HEADERS, headers)
      ctx.should.eql({
        traceId: 'abcdef',
        spanId: 'abcdef'
      })
    })

    it('should respect propagation order', () => {
      const headers = {'x-correlation-id': 'abcdef', 'ct-trace-id': 'xyz', 'ct-span-id': 'abc'}
      let ctx = tracer.extract(tracer.FORMAT_HTTP_HEADERS, headers)
      ctx.should.eql({
        traceId: 'xyz',
        spanId: 'abc'
      })
    })

    it('should handle undefined extractor gracefully', () => {
      const headers = {'x-correlation-id': 'abcdef', 'ct-trace-id': 'xyz', 'ct-span-id': 'abc'}
      let ctx = tracer.extract('fmt-custom', headers)
      should(ctx).be.undefined()
    })

    it('should handle undefined injector gracefully', () => {
      const ctx = {}
      const headers = {}
      tracer.inject(ctx, tracer.FORMAT_HTTP_HEADERS, headers)
      headers.should.eql({})
    })

    it('should inject custom', () => {
      const ctx = {traceId: 'abc', spanId: 'def'}
      const headers = {}
      tracer.inject(ctx, 'fmt-custom', headers)
      headers.should.eql({
        'custom-trace-id': 'abc',
        'custom-span-id': 'def',
        'trace-context': 'abc-def'
      })
    })
  })

  describe('with multi-event mode', () => {
    beforeEach(() => {
      tracer.init({stream, multiEvent: true})
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
