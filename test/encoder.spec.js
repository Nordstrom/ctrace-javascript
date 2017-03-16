'use strict'

const encoder = require('../lib/encoder.js')
require('should')

describe('encoder', () => {
  it('should encode full prefix', () => {
    let buffer = new Buffer(1024)
    let len = encoder.encodePrefix({
      traceId: 'abc',
      spanId: 'def',
      parentId: 'ghi',
      operation: 'op1',
      start: 1489522409134
    }, buffer)

    let str = buffer.toString('utf8', 0, len)

    str.should.equal(
      '{"traceId":"abc","spanId":"def","parentId":"ghi","operation":"op1","start":1489522409134000'
    )

    len.should.equal(91)
  })

  it('should encode partial prefix', () => {
    let buffer = new Buffer(1024)
    let len = encoder.encodePrefix({
      traceId: 'abc',
      spanId: 'def',
      operation: 'op1',
      start: 1489522409134
    }, buffer, 0)

    let str = buffer.toString('utf8', 0, len)

    str.should.equal(
      '{"traceId":"abc","spanId":"def","operation":"op1","start":1489522409134000'
    )

    len.should.equal(74)
  })

  it('should encode all tags', () => {
    let buffer = new Buffer(1024)
    let len = encoder.encodeTags({
      strtag: 'strval',
      'unsafe"tag"': '"unsafe"',
      dec_tag: 123.5,
      'num-tag': 123,
      'bool.tag': true
    }, buffer, 0)

    let str = buffer.toString('utf8', 0, len)

    str.should.equal(
      ',"tags":{"strtag":"strval","unsafe\\"tag\\"":"\\"unsafe\\"","dec_tag":123.5,"num-tag":123,"bool.tag":true}'
    )

    len.should.equal(102)
  })

  it('should encode falsy tags', () => {
    encoder.encodeTags(null).should.equal(0)
    encoder.encodeTags(undefined).should.equal(0)
  })

  it('should encode empty tags', () => {
    let buffer = new Buffer(1024)
    let len = encoder.encodeTags({}, buffer, 0)
    let str = buffer.toString('utf8', 0, len)
    str.should.equal(',"tags":{}')
    len.should.equal(10)
  })

  it('should encode all baggage', () => {
    let buffer = new Buffer(1024)
    let len = encoder.encodeBaggage({
      strtag: 'strval',
      'unsafe"tag"': '"unsafe"',
      dec_tag: 123.5,
      'num-tag': 123,
      'bool.tag': true
    }, buffer, 0)

    let str = buffer.toString('utf8', 0, len)

    str.should.equal(
      ',"baggage":{"strtag":"strval","unsafe\\"tag\\"":"\\"unsafe\\"","dec_tag":123.5,"num-tag":123,"bool.tag":true}'
    )

    len.should.equal(105)
  })

  it('should encode falsy baggage', () => {
    encoder.encodeBaggage(null).should.equal(0)
    encoder.encodeBaggage(undefined).should.equal(0)
  })

  it('should encode full logs', () => {
    let buffer = new Buffer(1024)
    let len = encoder.encodeLogs([
      {
        timestamp: 1489522409135,
        strlog: 'strval',
        'unsafe"log"': '"unsafe"'
      },
      {
        timestamp: 1489522409136,
        dec_log: 123.5,
        'num-log': 123,
        'bool.log': true
      }
    ], buffer, 0)

    let str = buffer.toString('utf8', 0, len)
    str.should.equal(
      ',"logs":[{"timestamp":1489522409135000,"strlog":"strval","unsafe\\"log\\"":"\\"unsafe\\""},' +
      '{"timestamp":1489522409136000,"dec_log":123.5,"num-log":123,"bool.log":true}]'
    )

    len.should.equal(164)
  })

  it('should encode falsy logs', () => {
    encoder.encodeLogs(null).should.equal(0)
    encoder.encodeLogs(undefined).should.equal(0)
  })

  it('should encode logs with no timestamp', () => {
    let buffer = new Buffer(1024)
    let len = encoder.encodeLogs([{strlog: 'strval'}], buffer, 0)

    let str = buffer.toString('utf8', 0, len)
    str.should.match(/,"logs":\[{"timestamp":\d{16},"strlog":"strval"}]/)

    len.should.equal(58)
  })

  it('should encode empty baggage', () => {
    let buffer = new Buffer(1024)
    let len = encoder.encodeBaggage({}, buffer, 0)
    let str = buffer.toString('utf8', 0, len)

    str.should.equal(',"baggage":{}')
    len.should.equal(13)
  })

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
      '"start":1489522409134000,"duration":123,"tags":{"tag1":"val1","tag2":"val2"},' +
      '"logs":[{"timestamp":1489522409135000,"event":"event1"}],' +
      '"baggage":{"bag1":"val1","bag2":"val2"}}'
    )
  })
})
