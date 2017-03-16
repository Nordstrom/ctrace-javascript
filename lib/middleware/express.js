// function loggedHandler (component, name, fn) {
//   return function handle (req, res) {
//     const context = tracer.extract(Tracer.FORMAT_HTTP_HEADERS, req.headers)
//     const span = tracer.startSpan(name, {
//       childOf: context,
//       tags: {
//         'span.kind': 'server',
//         'component': component,
//         'peer.hostname': req.hostname,
//         'peer.ipv6': req.ip,
//         'http.method': req.method,
//         'http.url': req.url
//       }
//     })
//     req.span = span
//
//     return fn(req, res)
//       .then(result => {
//         res.status(200).json(result)
//         span.addTags({'http.status_code': 200})
//         span.finish()
//       })
//       .catch(e => {
//         e = e.error || e
//         const statusCode = e.statusCode || 500
//         res.status(e.statusCode || 500).json(e)
//         span.addTags({
//           'http.status_code': statusCode,
//           'error': true
//         })
//         span.log({event: 'Server-Error', exception: JSON.stringify(e)})
//         span.finish()
//       })
//   }
// }
