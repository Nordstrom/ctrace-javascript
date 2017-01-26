
const url = require('url')
const express = require('express')
const request = require('request-promise')
const gateway = express()
const downstream = express()
const Tracer = require('../')
const tracer = new Tracer(process.stdout, 'msgpack')

// Log
function loggedHandler (component, name, fn) {
  return function handle (req, res) {
    const context = tracer.extract(Tracer.FORMAT_HTTP_HEADERS, req.headers)
    const span = tracer.startSpan(name, {
      childOf: context,
      tags: {
        'span.kind': 'server',
        'component': component,
        'peer.hostname': req.hostname,
        'peer.ipv6': req.ip,
        'http.method': req.method,
        'http.url': req.url
      }
    })
    req.span = span

    return fn(req, res)
      .then(result => {
        res.status(200).json(result)
        span.addTags({'http.status_code': 200})
        span.finish()
      })
      .catch(e => {
        e = e.error || e
        const statusCode = e.statusCode || 500
        res.status(e.statusCode || 500).json(e)
        span.addTags({
          'http.status_code': statusCode,
          'error': true
        })
        span.log({event: 'Server-Error', exception: JSON.stringify(e)})
        span.finish()
      })
  }
}

function loggedRequest (traceOpts, opts) {
  const urlObj = url.parse(opts.url)
  const span = tracer.startSpan(traceOpts.operation, {
    childOf: traceOpts.parentSpan,
    tags: {
      'span.kind': 'client',
      'component': traceOpts.component,
      'peer.hostname': urlObj.hostname,
      'peer.port': urlObj.port,
      'peer.service': traceOpts.peerService,
      'http.method': opts.method,
      'http.url': opts.url
    }
  })
  if (!opts.headers) opts.headers = {}
  tracer.inject(span, Tracer.FORMAT_HTTP_HEADERS, opts.headers)
  return request(opts)
    .then(result => {
      span.addTags({'http.status_code': 200})
      span.finish()
      return Promise.resolve(result)
    })
    .catch(e => {
      e = e.error || e
      const statusCode = e.statusCode || 500
      span.addTags({
        'http.status_code': statusCode,
        'error': true
      })
      span.log({event: 'Client-Error', exception: e.toString()})
      span.finish()
      return Promise.reject(e)
    })
}

gateway.post('/demo', loggedHandler('Gateway', 'UpdateDemo', (req, res) => {
  return loggedRequest({
    component: 'DownstreamClient',
    operation: 'UpdateDemoDownstream',
    peerService: 'Downstream',
    parentSpan: req.span
  }, {
    method: 'POST',
    url: 'http://localhost:8005/demo',
    body: req.body,
    json: true
  })
}))

gateway.get('/demo-error', loggedHandler('Gateway', 'DemoError', (req, res) => {
  return loggedRequest({
    component: 'DownstreamClient',
    operation: 'DemoErrorDownstream',
    peerService: 'Downstream',
    parentSpan: req.span
  }, {
    method: 'GET',
    url: 'http://localhost:8005/demo-error',
    json: true
  })
}))

downstream.post('/demo', loggedHandler('Downstream', 'UpdateDemoDownstream', (req, res) => {
  return Promise.resolve({text: 'Hello World'})
}))

downstream.get('/demo-error', loggedHandler('Downstream', 'DemoErrorDownstream', (req, res) => {
  return Promise.reject({statusCode: 400, message: 'Error'})
}))

gateway.listen(8004, () => {
  console.log('Gateway started')
})

downstream.listen(8005, () => {
  console.log('Downstream started')
})
