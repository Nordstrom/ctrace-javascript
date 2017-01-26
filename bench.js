const fs = require('fs')
const Benchmark = require('benchmark')
const suite = new Benchmark.Suite()
const uuid = require('uuid/v4')
const pino = require('pino')
const AvroWriter = require('../lib/writers/avro.js')
const MsgpackWriter = require('../lib/writers/msgpack.js')
const logger = pino(fs.createWriteStream('dump-pino.json'))

const Tracer = require('../')
const avroTracer = new Tracer({writer: new AvroWriter(fs.createWriteStream('dump.avro'))})
const msgTracer = new Tracer({writer: new MsgpackWriter(fs.createWriteStream('dump.mp'))})
const jsonTracer = new Tracer({stream: fs.createWriteStream('dump.json')})

suite.add('avro', () => { bench(avroTracer) })
suite.add('msgpack', () => { bench(msgTracer) })
suite.add('json', () => { bench(jsonTracer) })
suite.add('pino-logger', () => { benchLogger(logger) })

function benchLogger (logger) {
  const traceId = uuid()
  logger.info({
    traceId: traceId,
    spanId: traceId,
    operation: 'parent',
    tags: {
      'span.kind': 'server',
      'component': 'component',
      'peer.hostname': 'hostname',
      'peer.ipv6': 'ip',
      'http.method': 'method',
      'http.url': 'https://some.url.outthere.com'
    },
    log: {event: 'Start-Span', timestamp: Date.now()}
  })

  logger.info({
    traceId: traceId,
    spanId: traceId,
    operation: 'child',
    tags: {
      'span.kind': 'server',
      'component': 'component',
      'peer.hostname': 'hostname',
      'peer.ipv6': 'ip',
      'http.method': 'method',
      'http.url': 'https://some.url.outthere.com'
    },
    log: {event: 'Start-Span', timestamp: Date.now()}
  })

  logger.info({
    traceId: traceId,
    spanId: traceId,
    operation: 'child',
    tags: {
      'span.kind': 'server',
      'component': 'component',
      'peer.hostname': 'hostname',
      'peer.ipv6': 'ip',
      'http.method': 'method',
      'http.url': 'https://some.url.outthere.com'
    },
    log: {event: 'child-event', timestamp: Date.now()}
  })

  logger.info({
    traceId: traceId,
    spanId: traceId,
    operation: 'child',
    tags: {
      'span.kind': 'server',
      'component': 'component',
      'peer.hostname': 'hostname',
      'peer.ipv6': 'ip',
      'http.method': 'method',
      'http.url': 'https://some.url.outthere.com'
    },
    log: {event: 'Finish-Span', timestamp: Date.now()}
  })

  logger.info({
    traceId: traceId,
    spanId: traceId,
    operation: 'parent',
    tags: {
      'span.kind': 'server',
      'component': 'component',
      'peer.hostname': 'hostname',
      'peer.ipv6': 'ip',
      'http.method': 'method',
      'http.url': 'https://some.url.outthere.com'
    },
    log: {event: 'Finish-Span', timestamp: Date.now()}
  })
}

function bench (tracer) {
  // console.log('bench')
  const span = tracer.startSpan('parent', {
    tags: {
      'span.kind': 'server',
      'component': 'component',
      'peer.hostname': 'hostname',
      'peer.ipv6': 'ip',
      'http.method': 'method',
      'http.url': 'https://some.url.outthere.com'
    }
  })

  const child = tracer.startSpan('child', {
    childOf: span,
    tags: {
      'span.kind': 'server',
      'component': 'child-component',
      'peer.hostname': 'hostname',
      'peer.ipv6': 'ip',
      'http.method': 'method',
      'http.url': 'https://some.url.outthere.com'
    }
  })

  child.log({event: 'child-event'})
  child.finish()
  span.finish()
}

bench(avroTracer)

suite.on('cycle', (e) => {
  console.log(String(e.target))
})

suite.on('complete', (e) => {
  console.log('done')
})

suite.run({ 'async': true })
