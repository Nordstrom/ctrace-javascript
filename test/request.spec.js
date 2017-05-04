'use strict'

const should = require('should')
const urlParse = require('url').parse
const http = require('http')
const rp = require('request-promise')
const request = require('request')
const Stream = require('./util/stream.js')
const tracer = require('../')
const tr = tracer.request

function createServer () {
  let s = http.createServer(function (req, res) {
    let b = ''
    req.on('data', (chunk) => { b += chunk })
    req.on('end', () => {
      let path = urlParse(req.url).pathname
      let status = Number(path.split('?')[0].split('/')[1])
      switch (status) {
        case 301:
          res.writeHead(301, { Location: '/200' })
          res.end()
          break
        case 503:
          // Send no response at all
          break
        default:
          res.writeHead(status, {'Content-Type': 'application/json'})
          res.write(JSON.stringify({
            url: req.url,
            method: req.method,
            headers: req.headers,
            body: b
          }))
          res.end()
      }
    })
  })
  s.on('listening', function () {
    s.port = this.address().port
    s.url = 'http://localhost:' + s.port
  })
  s.port = 0
  s.protocol = 'http'
  return s
}

describe('request', () => {
  let s, buf, timestamp

  before((done) => {
    s = createServer()
    s.listen(0, () => {
      done()
    })
  })

  beforeEach(() => {
    let stream = new Stream()
    buf = stream.buf
    tr.init(rp)
    tracer.init({stream})
    timestamp = Date.now() * 1000
  })

  after((done) => {
    s.close(() => {
      done()
    })
  })

  it('should trace request-promise', () => {
    return tr({method: 'GET', uri: `${s.url}/200`, json: true})
      .then((res) => {
        let rec = JSON.parse(buf[0])
        rec.traceId.should.match(/[a-z0-9]{16}/)
        rec.spanId.should.match(/[a-z0-9]{16}/)
        rec.operation.should.equal('GET:/200')
        rec.start.should.be.aboveOrEqual(timestamp)
        rec.duration.should.be.above(0)
        rec.tags['http.url'].should.equal(s.url + '/200')
        rec.tags['http.status_code'].should.equal(200)
        rec.tags['peer.hostname'].should.equal('localhost')
        rec.tags['peer.port'].should.equal(s.port)
        rec.tags['span.kind'].should.equal('client')
        rec.tags['component'].should.equal('ctrace.request')
        rec.logs[0].timestamp.should.equal(rec.start)
        rec.logs[0].event.should.equal('Start-Span')
        rec.logs[1].timestamp.should.be.aboveOrEqual(rec.start)
        rec.logs[1].event.should.equal('Finish-Span')
        rec.duration.should.equal(rec.logs[1].timestamp - rec.logs[0].timestamp)

        res.method.should.equal('GET')
        res.url.should.equal('/200')
        res.headers['ct-trace-id'].should.equal(rec.traceId)
        res.headers['ct-span-id'].should.equal(rec.spanId)
      })
  })

  it('should trace request-promise with parent span', () => {
    let parent = tracer.startSpan('parent')
    let ctx = parent.context()
    return tr({
      method: 'GET',
      uri: `${s.url}/200`,
      json: true,
      traceContext: {span: parent}
    })
      .then((res) => {
        let rec = JSON.parse(buf[0])
        rec.traceId.should.equal(ctx.traceId)
        rec.spanId.should.match(/[a-z0-9]{16}/)
        rec.parentId.should.equal(ctx.spanId)
        res.headers['ct-trace-id'].should.match(rec.traceId)
        res.headers['ct-span-id'].should.match(rec.spanId)
      })
  })

  it('should get op from url', () => {
    return tr({ method: 'GET', url: urlParse(`${s.url}/200`), json: true })
      .then((res) => {
        let rec = JSON.parse(buf[0])
        rec.operation.should.equal('GET:/200')
      })
  })

  it('should get op from context.operation', () => {
    return tr({ method: 'GET', uri: `${s.url}/200`, traceContext: { operation: 'tst-op' }, json: true })
      .then((res) => {
        let rec = JSON.parse(buf[0])
        rec.operation.should.equal('tst-op')
      })
  })

  it('should get peerService from context.peerService', () => {
    return tr({ method: 'GET', uri: `${s.url}/200`, traceContext: { peerService: 'tst-svc' }, json: true })
      .then((res) => {
        let rec = JSON.parse(buf[0])
        rec.tags['peer.service'].should.equal('tst-svc')
      })
  })

  it('should mark error on 400', () => {
    return tr({ method: 'GET', uri: `${s.url}/400`, json: true })
      .catch(() => {
        let rec = JSON.parse(buf[0])
        rec.tags['error'].should.be.true()
      })
  })

  it('should mark http.status_code on 400', () => {
    return tr({ method: 'GET', uri: `${s.url}/400`, json: true })
      .catch(() => {
        let rec = JSON.parse(buf[0])
        rec.tags['http.status_code'].should.equal(400)
      })
  })

  it('should log event on 400', () => {
    return tr({ method: 'GET', uri: `${s.url}/400`, json: true })
      .catch(() => {
        let rec = JSON.parse(buf[0])
        rec.logs[1].timestamp.should.be.aboveOrEqual(rec.logs[0].timestamp)
        rec.logs[1].timestamp.should.be.belowOrEqual(rec.logs[1].timestamp)
        rec.logs[1].event.should.equal('error')
        rec.logs[1]['error.kind'].should.equal('StatusCodeError')
        rec.logs[1]['error.object'].should.match(/StatusCodeError: 400 - \{"url":"\/400","method":"GET","headers":\{"ct-trace-id":"[a-f0-9]{16}","ct-span-id":"[a-f0-9]{16}",/)
        rec.logs[1].message.should.match(/400 - \{"url":"\/400","method":"GET","headers":\{"ct-trace-id":"[a-f0-9]{16}","ct-span-id":"[a-f0-9]{16}",/)
        rec.logs[1].stack.should.match(/StatusCodeError: 400 - \{"url":"\/400","method":"GET","headers":{"ct-trace-id":"[a-f0-9]{16}","ct-span-id":"[a-f0-9]{16}","host":".+","accept":"application\/json","connection":"close"},"body":""}\n +at new StatusCodeError/)
      })
  })

  it('should handle connection error', () => {
    return tr({ method: 'GET', uri: `http://localhost/unknown/unknown`, json: true })
      .catch((err) => {
        let rec = JSON.parse(buf[0])
        err.name.should.equal('RequestError')
        rec.tags.error.should.be.true()
        rec.logs[1].timestamp.should.be.aboveOrEqual(rec.logs[0].timestamp)
        rec.logs[1].timestamp.should.be.belowOrEqual(rec.logs[1].timestamp)
        rec.logs[1].event.should.equal('error')
        rec.logs[1]['error.kind'].should.equal('RequestError')
        rec.logs[1]['error.object'].should.equal('RequestError: Error: connect ECONNREFUSED 127.0.0.1:80')
        rec.logs[1].message.should.equal('Error: connect ECONNREFUSED 127.0.0.1:80')
        rec.logs[1].stack.should.match(/RequestError: Error: connect ECONNREFUSED 127\.0\.0\.1:80\n +at new RequestError/)
      })
  })

  it('should handle 400 with resolveWithFullResponse and non-simple', () => {
    return tr({ method: 'GET', uri: `${s.url}/400`, resolveWithFullResponse: true, simple: false })
      .catch(() => {
        let rec = JSON.parse(buf[0])
        rec.logs[1].timestamp.should.be.aboveOrEqual(rec.logs[0].timestamp)
        rec.logs[1].timestamp.should.be.belowOrEqual(rec.logs[1].timestamp)
        rec.logs[1].event.should.equal('error')
        rec.logs[1]['error.kind'].should.equal('StatusCodeError')
        rec.logs[1]['error.object'].should.match(/StatusCodeError: 400 - \{"url":"\/400","method":"GET","headers":\{"ct-trace-id":"[a-f0-9]{16}","ct-span-id":"[a-f0-9]{16}",/)
        rec.logs[1].message.should.match(/400 - \{"url":"\/400","method":"GET","headers":\{"ct-trace-id":"[a-f0-9]{16}","ct-span-id":"[a-f0-9]{16}",/)
        rec.logs[1].stack.should.match(/StatusCodeError: 400 - \{"url":"\/400","method":"GET","headers":{"ct-trace-id":"[a-f0-9]{16}","ct-span-id":"[a-f0-9]{16}","host":".+","accept":"application\/json","connection":"close"},"body":""}\n +at new StatusCodeError/)
      })
  })

  it('should trace request', (done) => {
    tr.trace(request)({method: 'GET', uri: `${s.url}/200`, json: true}, (err, res, body) => {
      should(err).equal(null)
      let rec = JSON.parse(buf[0])
      rec.traceId.should.match(/[a-z0-9]{16}/)
      rec.spanId.should.match(/[a-z0-9]{16}/)
      rec.operation.should.equal('GET:/200')
      rec.start.should.be.aboveOrEqual(timestamp)
      rec.duration.should.be.above(0)
      rec.tags['http.url'].should.equal(s.url + '/200')
      rec.tags['http.status_code'].should.equal(200)
      rec.tags['peer.hostname'].should.equal('localhost')
      rec.tags['peer.port'].should.equal(s.port)
      rec.tags['span.kind'].should.equal('client')
      rec.tags['component'].should.equal('ctrace.request')
      rec.logs[0].timestamp.should.equal(rec.start)
      rec.logs[0].event.should.equal('Start-Span')
      rec.logs[1].timestamp.should.be.aboveOrEqual(rec.start)
      rec.logs[1].event.should.equal('Finish-Span')
      rec.duration.should.equal(rec.logs[1].timestamp - rec.logs[0].timestamp)

      body.method.should.equal('GET')
      body.url.should.equal('/200')
      body.headers['ct-trace-id'].should.equal(rec.traceId)
      body.headers['ct-span-id'].should.equal(rec.spanId)
      done()
    })
  })

  it('should handle invalid request fn', () => {
    (() => tr.trace(() => {})({})).should.throw('() => {} does not return a promise')
  })
})
