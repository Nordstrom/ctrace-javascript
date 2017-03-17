'use strict'

const opentracing = require('opentracing')
let tracer

/**
 *
 * @param {Object} [opts]
 * @param {Function} [opts.operationNameBuilder]
 * @returns {Function}
 */
// todo: allow tracer to be passed in as option
function expressMiddleware (opts) {
  opts = opts || {}

  return function handle (req, res, next) {
    if (!tracer) {
      tracer = opentracing.globalTracer()
    }
    const context = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
    let opName = (opts.operationNameBuilder && opts.operationNameBuilder(req)) || `${req.method}:${req.originalUrl}`
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl

    const span = tracer.startSpan(opName, {
      childOf: context,
      tags: {
        'span.kind': 'server',
        'component': 'ctrace-express',
        'http.remote_addr': req.ip,
        'http.method': req.method,
        'http.url': fullUrl
      }
    })
    req.traceContext = { span: span }

    res.on('finish', function () {
      if (res.statusCode >= 400) {
        span.addTags({
          'http.status_code': res.statusCode,
          'error': true
        })
      } else {
        span.addTags({'http.status_code': res.statusCode})
      }
      span.finish()
    })

    next()
  }
}

module.exports = expressMiddleware
