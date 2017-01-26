# ctrace-js
ctrace-js is a Canonical [OpenTracing](http://opentracing.io/) implementation for Javascript.  It follows the [ctrace](https://github.com/Nordstrom/ctrace) specification.

## Why
[OpenTracing](http://opentracing.io) is a young specification and for most (if not all) SDK implementations, output format and wire protocol are specific to the backend platform implementation.  ctrace attempts to decouple the format and wire protocol from the backend tracer implementation.

## What
ctrace specifies a canonical format for trace logs.  By default the logs are output to stdout but you can configure them to go to any WritableStream.

## Required Reading
To fully understand this platform API, it's helpful to be familiar with the [OpenTracing project](http://opentracing.io) project, [terminology](http://opentracing.io/documentation/pages/spec.html), and [ctrace specification](https://github.com/Nordstrom/ctrace) more specifically.

## Install
Install via npm as follows:

```
$ npm install ctrace --save
```

## Usage
Add instrumentation to the operations you want to track. This is composed primarily of using "spans" around operations of interest and adding log statements to capture useful data relevant to those operations.

### New Tracer
You can create a new ctrace Tracer like this.

```js
const Tracer = require('ctrace')
const tracer = new Tracer()
```

### Start Client Span
If you want to track a call to a downstream REST service, start a new client Span like this.

```js
const span = tracer.startSpan('RegisterUser', {
  // Apply Standard Tags
  tags: {
    'span.kind': 'client',
    'component': 'UserAdapter',
    'peer.hostname': 'my-registry.net',
    'peer.port': '443',
    'peer.service': 'UserRegistry',
    'http.method': 'POST',
    'http.url': 'https://my-registry.net/users?apikey=293283209'
  }
})
```

### Inject Context
The downstream REST service will want to use this span as its parent.  We will inject the span
context into the HTTP Headers for this purpose as follows.

```js
const headers = {}
tracer.inject(span, Tracer.FORMAT_HTTP_HEADERS, headers)
```

### Start Server Span
The called REST service can start a server Span as follows.

```js
const express = require('express')
const app = express()
const Tracer = require('ctrace')
const tracer = new Tracer()

app.post('/users', (req, res) => {
  const context = tracer.extract(Tracer.FORMAT_HTTP_HEADERS, req.headers)
  const span = tracer.startSpan('RegisterUser', {
    childOf: context,  // include parent context
    // Standard Tags
    tags: {
      'span.kind': 'server',
      'component': 'UserRegistryController',
      'peer.ipv4': req.ip,
      'http.method': req.method,
      'http.url': req.url
    }
  })

  ...

})
```

### Log Event
The REST service might want to log the DB update as follows.

```js
  span.log({event: 'SaveUser', userId: ...})
```

### Finish Server Span
If the REST service call completes successfully on the server, add tag for
status and finish the span.

```

```js
app.post('/users', (req, res) => {

  ...

  span.addTags({'http.status_code': 200})
  span.finish()
  res.status(200).json(result)
})
```

If it completes with an error, , do the following to add tags for status code,
error=true, recommended error_details, and finish the span.

```js
app.post('/users', (req, res) => {

  ...

  span.addTags({
    'http.status_code': 500,
    'error': true,
    'error_details': error.toString()
  })
  span.finish()
  res.status(500).json(error)
})

```

### Finish Client Span
If the call to the downstream REST service completes successfully, finish the client Span like this.

```js
span.addTags({'http.status_code': 200})
span.finish()
```

If the call completes with an error, finish the client Span like this.

```js
span.addTags({
  // Standard Tags and Recommended error_details
  'http.status_code': 500,
  'error': true,
  'error_details': err.toString()
})
span.finish()
```

```js
// require and create a new Tracer
const request = require('request-promise')
const Tracer = require('ctrace')
const tracer = new Tracer()

// Start a new Span to track the call to downstream service.  This will trigger Start-Span Event.
const span = tracer.startSpan('CreateUser', {
  tags: {
    'span.kind': 'client',
    'component': 'UserAdapter',
    'peer.hostname': 'my-registry.net',
    'peer.port': '443',
    'peer.service': 'UserRegistry',
    'http.method': 'POST',
    'http.url': 'https://my-registry.net/users?apikey=293283209'
  }
})

const opts = {
  method: 'POST',
  url: 'https://my-registry.net/users?apikey=293283209',
  headers: {},
  body: body,
  json: true
}

tracer.inject(span, Tracer.FORMAT_HTTP_HEADERS, opts.headers)
return request(opts)
  .then(result => {
    // Add 200 status code to span
    span.addTags({'http.status_code': 200})
    span.finish()
    // More Business Logic here...
  })
  .catch(e => {
    // Make sure you get the wrapped error
    e = e.error || e
    const statusCode = e.statusCode || 500

    // Add error status code and error=true tags to span
    span.addTags({
      'http.status_code': statusCode,
      'error': true,
      'error_details': e.toString()
    })

    // Finish the span.  This will trigger Finish-Span Event.
    span.finish()
    // More Business Logic here...
  })
```

That downstream REST service may track its handling of that call as follows.

```js
const url = require('url')
const express = require('express')
const app = express()
const Tracer = require('ctrace')
const tracer = new Tracer()

app.post('/users', (req, res) => {
  const context = tracer.extract(Tracer.FORMAT_HTTP_HEADERS, req.headers)
  const span = tracer.startSpan('CreateUser', {
    childOf: context,
    tags: {
      'span.kind': 'server',
      'component': 'UserRegistryController',
      'peer.ipv4': req.ip,
      'http.method': req.method,
      'http.url': req.url
    }
  })
  // Do some more business logic...  If span logging is need in helper functions
  // make sure to pass span as an argument to access span.log
  ...

  // It may log saving the user to the registry db like this.
  span.log({event: 'SaveUser', userId: ...})

  ...
  // On Success, do the following to add status code tag and finish the span
  res.status(200).json(result)
  span.addTags({'http.status_code': 200})
  span.finish()

  ...
  // On Error, do the following to add the status code tag, set error=true,
  // log the error, and finish the span
  res.status(500).json(error)
  span.addTags({
    'http.status_code': 500,
    'error': true,
    'error_details': error.toString()
  })
  span.finish()
})
```
