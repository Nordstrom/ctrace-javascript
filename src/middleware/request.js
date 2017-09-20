import {parse as urlParse} from 'url'
import 'opentracing'
import tracer from '../'

const _global = {
  request: require('request-promise'),
  config: {}
}

function handleResponse (span, status, err, msg) {
  if (err instanceof Error || status >= 400) {
    // Error detected.  Mark error, status code, and log error event
    span.setTag('error', true)
    if (status) span.setTag('http.status_code', status)

    let log = {event: 'error'}
    if (err) {
      if (err.name) log['error.kind'] = err.name
      log['error.object'] = err.toString()
      if (err.message) log.message = msg || err.message
      if (err.stack) log.stack = err.stack
    }
    span.log(log)
  } else {
    // Success detect.  Add status code (default 200)
    span.setTag('http.status_code', status || 200)
  }
  span.finish()
}

function sendWithCb (span, request, options, cb) {
  function wrappedCallback (err, response, body) {
    handleResponse(span, response.statusCode, err)
    cb(err, response, body)
  }

  return request(options, wrappedCallback)
}

function sendWithPromise (span, request, options) {
  let promise = request(options)
  if (!promise) {
    throw new Error(`${request} does not return a promise`)
  }
  return promise
    .then((res = {}) => {
      handleResponse(span, res.statusCode, res.body, res.statusMessage)
      return res
    })
    .catch((err) => {
      handleResponse(span, err.statusCode, err)
      throw err
    })
}

function init (request, config) {
  _global.request = request
  _global.config = config
}

function trace (request, config) {
  return function tracedRequest (options, cb) {
    if (!request) request = _global.request
    if (!config) config = _global.config

    let ctx = options.traceContext || {}
    let parent = ctx.span

    let url =
      options.url ||
      (options.uri && urlParse(options.uri)) ||
      {href: 'unknown', port: 0, hostname: 'unknown'}

    let method = options.method || 'GET'

    let op =
      ctx.operation ||
      (config && config.getOperationName && config.getOperationName(options)) ||
      `${method || 'GET'}:${url.path}`

    let peerService =
      ctx.peerService ||
      (config && config.getPeerServiceName && config.getPeerServiceName(options))

    let tags = {
      'span.kind': 'client',
      'component': 'ctrace.request',
      'http.method': method,
      'http.url': url.href,
      'peer.hostname': url.hostname,
      'peer.port': parseInt(url.port || '80')
    }

    if (peerService) {
      tags['peer.service'] = peerService
    }
    let span = tracer.startSpan(op, {childOf: parent, tags: tags})

    if (!options.headers) options.headers = {}

    tracer.inject(span.context(), tracer.FORMAT_HTTP_HEADERS, options.headers)

    if (cb && (typeof cb) === 'function') {
      return sendWithCb(span, request, options, cb)
    }

    return sendWithPromise(span, request, options)
  }
}

const t = trace()
t.init = init
t.trace = trace

export default t
