'use strict'

require('should')

const tracer = require('../')
const Stream = require('./util/stream.js')

describe('span', () => {
  let stream, buf, timestamp, parent, child

  beforeEach(() => {
    stream = new Stream()
    buf = stream.buf
    timestamp = Date.now()
  })

  describe('with single-event mode', () => {
    beforeEach(() => {
      tracer.init({stream})
      parent = tracer.startSpan('parent')
      child = tracer.startSpan('child', {childOf: parent})
    })

    it('should return tracer', () => {
      JSON.stringify(parent.tracer()).should.match(/_propagation/)
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

    it('should log with timestamp', () => {
      parent.log({}, 1489522409134)
      let fields = parent._fields
      fields.logs[1].timestamp.should.equal(1489522409134000)
    })

    it('should log with timestamp key/value', () => {
      parent.log({timestamp: 1489522409134})
      let fields = parent._fields
      fields.logs[1].timestamp.should.equal(1489522409134000)
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
      rec.start.should.equal(fields.start)
      rec.operation.should.equal('child')
      rec.duration.should.be.aboveOrEqual(0)
      rec.logs[0].timestamp.should.equal(fields.logs[0].timestamp)
      rec.logs[0].event.should.equal('Start-Span')
      rec.logs[1].timestamp.should.equal(fields.logs[1].timestamp)
      rec.logs[1].event.should.equal('Finish-Span')
    })
  })

  describe('with multi-event mode', () => {
    beforeEach(() => {
      tracer.init({stream, multiEvent: true})
      parent = tracer.startSpan('parent')
    })

    it('should log', () => {
      parent.log({event: 'my-event'})
      let fields = parent._fields

      fields.logs[0].timestamp.should.be.aboveOrEqual(fields.start)
      fields.logs[0].event.should.equal('my-event')

      let rec = JSON.parse(buf[1])
      rec.logs[0].timestamp.should.equal(fields.logs[0].timestamp)
      rec.logs[0].event.should.equal('my-event')
    })

    it('should finish', () => {
      parent.finish()
      let fields = parent._fields
      fields.duration.should.be.aboveOrEqual(0)
      fields.logs[0].timestamp.should.be.aboveOrEqual(timestamp)
      fields.logs[0].event.should.equal('Finish-Span')
    })
  })
})
