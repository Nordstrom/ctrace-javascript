'use strict'

require('should')

const opentracing = require('opentracing')
const Tracer = require('../')
const Stream = require('./util/stream.js')

describe.only('span', () => {
  let stream, buf, tracer, timestamp, parent, child

  beforeEach(() => {
    stream = new Stream()
    buf = stream.buf
    timestamp = Date.now()
  })

  describe('with single-event mode', () => {
    beforeEach(() => {
      tracer = new Tracer({stream})
      opentracing.initGlobalTracer(tracer)
      parent = opentracing.globalTracer().startSpan('parent')
      child = opentracing.globalTracer().startSpan('child', {childOf: parent})
    })

    it('should return tracer', () => {
      parent.tracer().should.equal(tracer)
    })

    it('should return context', () => {
      parent.context().should.equal(parent._fields)
    })

    it('should set operation name', () => {
      parent.setOperationName('newop')._fields.operation.should.equal('newop')
    })

    it('should set baggage item', () => {
      parent.setBaggageItem('bag1', 'val1')._fields.baggage.should.eql({bag1: 'val1'})
      parent.setBaggageItem('bag2', 'val2')._fields.baggage.should.eql({bag1: 'val1', bag2: 'val2'})
    })

    it('should get baggage item', () => {
      parent.setBaggageItem('bag1', 'val1')
      parent.getBaggageItem('bag1').should.equal('val1')
    })

    it('should log', () => {
      parent.log({event: 'my-event'})
      let fields = parent._fields

      fields.logs[1].timestamp.should.be.aboveOrEqual(fields.start)
      fields.logs[1].event.should.equal('my-event')

      buf.should.be.empty()
    })

    it('should set tag', () => {
      parent.setTag('tag1', 'val1')
      parent._fields.tags.tag1.should.equal('val1')
    })

    it('should add tags', () => {
      parent.addTags({tag1: 'val1', tag2: 'val2'})
      parent._fields.tags.should.eql({tag1: 'val1', tag2: 'val2'})
    })

    it('should output tags', () => {
      parent.setTag('tag1', 'val1')
      parent.finish()
      let rec = JSON.parse(buf[0])
      rec.tags.tag1.should.equal('val1')
    })

    it('should finish', () => {
      child.finish()
      let fields = child._fields
      fields.traceId.should.match(/[a-z0-9]{16}/)
      fields.spanId.should.match(/[a-z0-9]{16}/)
      fields.parentId.should.match(/[a-z0-9]{16}/)
      fields.start.should.be.aboveOrEqual(timestamp)
      fields.operation.should.equal('child')
      fields.duration.should.be.aboveOrEqual(0)
      fields.logs[0].timestamp.should.be.aboveOrEqual(child._fields.start)
      fields.logs[0].event.should.equal('Start-Span')
      fields.logs[1].timestamp.should.be.aboveOrEqual(child._fields.start)
      fields.logs[1].event.should.equal('Finish-Span')
    })

    it('should output finish', () => {
      child.finish()
      let fields = child._fields
      let rec = JSON.parse(buf[0])
      rec.traceId.should.equal(fields.traceId)
      rec.spanId.should.equal(fields.spanId)
      rec.parentId.should.equal(fields.parentId)
      rec.start.should.equal(fields.start * 1000)
      rec.operation.should.equal('child')
      rec.duration.should.be.aboveOrEqual(0)
      rec.logs[0].timestamp.should.equal(fields.logs[0].timestamp * 1000)
      rec.logs[0].event.should.equal('Start-Span')
      rec.logs[1].timestamp.should.equal(fields.logs[1].timestamp * 1000)
      rec.logs[1].event.should.equal('Finish-Span')
    })
  })

  describe('with multi-event mode', () => {
    beforeEach(() => {
      opentracing.initGlobalTracer(new Tracer({stream, multiEvent: true}))
      tracer = opentracing.globalTracer()
      parent = tracer.startSpan('parent')
    })

    it('should log', () => {
      parent.log({event: 'my-event'})
      let fields = parent._fields

      fields.logs[0].timestamp.should.be.aboveOrEqual(fields.start)
      fields.logs[0].event.should.equal('my-event')

      let rec = JSON.parse(buf[1])
      rec.logs[0].timestamp.should.equal(fields.logs[0].timestamp * 1000)
      rec.logs[0].event.should.equal('my-event')
    })
  })
})
