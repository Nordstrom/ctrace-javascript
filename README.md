# ctrace-js
[![Build Status][ci-img]][ci] [![Coverage Status][cov-img]][cov] [![NPM Version][npm-img]][npm] [![OpenTracing 1.0 Enabled][ot-img]][ot-url]

[Canonical OpenTracing](https://github.com/Nordstrom/ctrace-js) for Javascript

> Currently this only supports Node.js usage.  Browser-based Javascript support will be added later.

## Why
[OpenTracing](http://opentracing.io) is a young specification and for most (if not all) SDK implementations, output format and wire protocol are specific to the backend platform implementation.  ctrace-js attempts to decouple the format and wire protocol from the backend tracer implementation.

## What
ctrace-js specifies a canonical format for trace logs.  By default the logs are output to stdout but you can configure them to go to any WritableStream.

## Required Reading
To fully understand this platform API, it's helpful to be familiar with the [OpenTracing project](http://opentracing.io) project, [terminology](http://opentracing.io/documentation/pages/spec.html), and [ctrace-js specification](https://github.com/Nordstrom/ctrace-js/tree/new) more specifically.

## Install
Install via npm as follows:

```
$ npm install ctrace-js --save
```

## Usage
Add instrumentation to the operations you want to track. This is composed primarily of using "spans" around operations of interest and adding log statements to capture useful data relevant to those operations.

### Initialize Global Tracer
First, initialize the global tracer as follows.

```js
const tracer = require('ctrace-js')
```

OR, initialize the global tracer with custom options as follows.

```js
const tracer = require('ctrace-js')
tracer.init({
  multiEvent: true,  // true for Multi-Event Mode; false for Single-Event Mode.  defaults to false.
  debug: true,       // true to enabling debugging.  defaults to false.
  propagators: {     // custom propagators mapped to format type
    [tracer.FORMAT_HTTP_HEADERS]: [
      {
        extract: (carrier) => {
          if (carrier['x-correlation-id']) {
            return {
              traceId: carrier['x-correlation-id'],
              spanId: carrier['x-correlation-id']
            }
          }
        }
      }
    ]
  },
  serviceName: "ExampleService" // can set service name for entire tracer 
})
```

### Client HTTP Requests
To trace client HTTP requests you can use the `request` wrapper for [request-promise](https://www.npmjs.com/package/request-promise) or [request](https://www.npmjs.com/package/request).  To trace a request using [request-promise](https://www.npmjs.com/package/request-promise) do the following.

```js
const request = require('ctrace-js').request
```

OR, to trace using [request](https://www.npmjs.com/package/request) do the following.

```js
const request = require('ctrace-js').request
request.init(require('request'))
```

You can then send HTTP(S) requests in this or other modules as follows.

```js
const request = require('ctrace-js').request

function send (span, uri, body) {
  return request({
    method: 'POST',
    uri: uri,
    body: body,
    traceContext: {
      span: span   // Current opentracing span
    }
  })
}
```

### Use Express Middleware for server spans
Add the Express Middleware as follows to trace HTTP REST server calls.

```js
const express = require('express')
const tracer = require('ctrace-js')
const app = express()

app.use(tracer.express)

app.post('/users', (req, res) => {
  // ...
})
```

### Log Event
Log events as follows.

```js
app.post('/users', (req, res) => {
  const span = req.span
  span.log({event: 'SaveUser', userId: 'u123'})
  // ...
})
```

### Log Errors
Log errors and return visible trace context as follows.

```js
app.post('/users', (req, res) => {
  const span = req.span
  try {
    // ...
  } catch (err) {
    span.log({
      event: 'error',
      'error.kind': 'Exception',
      message: err.message,
      stack: err.stack
    })

    let ctx = span.context()
    res.status(500).json({
      error: err.message,
      traceId: ctx.traceId,
      spanId: ctx.spanId
    })
  }
})
```

## [Advanced Usage](ADVANCED.md)
For advanced usage go [here](ADVANCED.md).

## [API](API.md)
For API documentation go [here](API.md).

## Roadmap
- [x] Core Start, Log, and Finish Span
- [x] Inject, Extract to Text and Header formats
- [ ] Inject, Extract to Binary format
- [x] Express Middleware support
- [x] Request and Request-Promise interceptor support
- [ ] Kinesis, Lambda and Plain Lambda wrapper support
- [ ] API Gateway / Lambda in Proxy Mode support

[ci-img]: https://travis-ci.org/Nordstrom/ctrace-js.svg?branch=new
[ci]: https://travis-ci.org/Nordstrom/ctrace-js
[cov-img]: https://coveralls.io/repos/github/Nordstrom/ctrace-js/badge.svg?branch=new
[cov]: https://coveralls.io/github/Nordstrom/ctrace-js?branch=new
[npm-img]: https://img.shields.io/npm/v/ctrace-js.svg
[npm]: https://www.npmjs.com/package/ctrace-js
[ot-img]: https://img.shields.io/badge/OpenTracing--1.0-enabled-blue.svg
[ot-url]: http://opentracing.io
