'use strict'

const opentracing = require('opentracing')
let tracer

// Default name builder for operation name
function methodUrlNameBuilder (req) {
  return `${req.method}-${req.originalUrl}`
}
/**
 *
 * @param {Object} [opts]
 * @param {Function} [opts.nameBuilder]
 * @returns {Function}
 */
// todo: allow tracer to be passed in as option
function expressMiddleware (opts) {
  opts = opts || {}
  let nameBuilder = opts.nameBuilder || methodUrlNameBuilder

  return function handle (req, res, next) {
    if (!tracer) {
      tracer = opentracing.globalTracer()
    }
    const context = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
    let name = nameBuilder(req)
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl

    const span = tracer.startSpan(name, {
      childOf: context,
      tags: {
        'span.kind': 'server',
        'component': 'ctrace-express',
        'peer.hostname': req.hostname,
        'http.remote_addr': req.ip,
        'http.method': req.method,
        'http.url': fullUrl
      }
    })
    req.span = span

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
