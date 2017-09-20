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

    $ npm install ctrace-js --save

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
  stream: { // optional but defaults to stdout
    write: (content) => { // Modify the anonymous function to write logs to an writable stream
      console.log(content)
    }
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

app.use(tracer.express())

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

## [Advanced Usage]

The following are examples of advanced usage.  In these examples, tracing is done
manually rather than using auto-instrumentation middleware.

> NOTE: If you are using auto-instrumentation middleware (express, request, etc) there is no need to use manually start and finish spans.

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
tracer.inject(span.context(), Tracer.FORMAT_HTTP_HEADERS, headers)
```

### Start Server Span

The called REST service can start a server Span as follows.

```js
const express = require('express')
const app = express()
const tracer = require('ctrace')

app.post('/users', (req, res) => {
  const context = tracer.extract(tracer.FORMAT_HTTP_HEADERS, req.headers)
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

### Finish Server Span

If the REST service call completes successfully on the server, add tag for
status and finish the span.

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

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### SpanContext

An object containing the context used to propagate from span to span

Type: [object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)

**Properties**

-   `traceId` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** id of trace including multiple spans
-   `spanId` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** id of span (start/stop event)
-   `baggage` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String), [string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)>** optional key/value map of tags that carry across spans in a single trace.

### Propagators

Type: [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[Propagator](#propagator)>

### GlobalTracer

Global tracer singleton.  This is accessed as follows.

    const tracer = require('ctrace')

#### startSpan

Singleton wrapper for [Tracer#startSpan](#tracerstartspan)

**Parameters**

-   `name`  
-   `context`  

#### init

Used to initialize global tracer singleton

**Parameters**

-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** options used to initialize tracer
    -   `options.multiEvent` **bool?** true for multi-event mode; otherwise, single-event mode
    -   `options.debug` **bool?** true for debug; otherwise, it is disabled
    -   `options.propagators` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String), [Propagators](#propagators)>?** optional propagators
    -   `options.serviceName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** allows the configuration of the "service" tag for the entire Tracer if not
                                                specified here, can also be set using env variable "ctrace_service_name"

### Propagator

Interface for custom context propagation.  If extract or inject methods are present they
will be used in the propagation chain.

#### extract

Extract span context from a given carrier.

**Parameters**

-   `carrier` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)**

Returns **[SpanContext](#spancontext)**

#### inject

Inject span context into a given carrier.

**Parameters**

-   `spanContext` **[SpanContext](#spancontext)**
-   `carrier` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)**

### Span

**Extends opentracing.Span**

Span represents a logical unit of work as part of a broader Trace. Examples
of span might include remote procedure calls or a in-process function calls
to sub-components. A Trace has a single, top-level "root" Span that in turn
may have zero or more child Spans, which in turn may have children.

**Parameters**

-   `tracer`  
-   `fields`  

#### constructor

Constructor for internal use only.  To start a span call [Tracer#startSpan](#tracerstartspan)

**Parameters**

-   `tracer` **[Tracer](#tracer)**
-   `fields` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)**

#### context

Returns the SpanContext object associated with this Span.

Returns **[SpanContext](#spancontext)**

#### tracer

Returns the Tracer object used to create this Span.

Returns **[Tracer](#tracer)**

#### setOperationName

Sets the string name for the logical operation this span represents.

**Parameters**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)**

Returns **[Span](#span)** this

#### setBaggageItem

Sets a key:value pair on this Span that also propagates to future
children of the associated Span.

setBaggageItem() enables powerful functionality given a full-stack
opentracing integration (e.g., arbitrary application data from a web
client can make it, transparently, all the way into the depths of a
storage system), and with it some powerful costs: use this feature with
care.

IMPORTANT NOTE #1: setBaggageItem() will only propagate baggage items to
_future_ causal descendants of the associated Span.

IMPORTANT NOTE #2: Use this thoughtfully and with care. Every key and
value is copied into every local _and remote_ child of the associated
Span, and that can add up to a lot of network and cpu overhead.

**Parameters**

-   `key` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `value` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)**

#### getBaggageItem

Returns the value for a baggage item given its key.

**Parameters**

-   `key` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The key for the given trace attribute.

Returns **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** String value for the given key, or undefined if the key does not
        correspond to a set trace attribute.

#### setTag

Adds a single tag to the span.  See `addTags()` for details.

**Parameters**

-   `key` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)**
-   `value` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)**

Returns **[Span](#span)** this

#### addTags

Adds the given key value pairs to the set of span tags.

Multiple calls to addTags() results in the tags being the superset of
all calls.

The behavior of setting the same key multiple times on the same span
is undefined.

The supported type of the values is implementation-dependent.
Implementations are expected to safely handle all types of values but
may choose to ignore unrecognized / unhandle-able values (e.g. objects
with cyclic references, function objects).

**Parameters**

-   `keyValues` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String), [object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>**

Returns **[Span](#span)** this

#### log

Add a log record to this Span, optionally at a user-provided timestamp.

For example:

    span.log({
        size: rpc.size(),  // numeric value
        URI: rpc.URI(),  // string value
        payload: rpc.payload(),  // Object value
        "keys can be arbitrary strings": rpc.foo(),
    });

    span.log({
        "error.description": someError.description(),
    }, someError.timestampMillis());

**Parameters**

-   `keyValues` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String), [object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>** An object mapping string keys to arbitrary value types. All
           Tracer implementations should support bool, string, and numeric
           value types, and some may also support Object values.
-   `timestamp` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** An optional parameter specifying the timestamp in milliseconds
           since the Unix epoch. Fractional values are allowed so that
           timestamps with sub-millisecond accuracy can be represented. If
           not specified, the implementation is expected to use its notion
           of the current time of the call.

Returns **[Span](#span)** this

#### finish

Sets the end timestamp and finalizes Span state.

With the exception of calls to Span.context() (which are always allowed),
finish() must be the last call made to any span instance, and to do
otherwise leads to undefined behavior.

**Parameters**

-   `finishTime` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** Optional finish time in milliseconds as a Unix timestamp. Decimal
            values are supported for timestamps with sub-millisecond accuracy.
            If not specified, the current time (as defined by the
            implementation) will be used.

### Tracer

Tracer is the tracing entry-point.  It facilitates starting a new span and
context propagation (ie. inject, extract).

**Parameters**

-   `options`   (optional, default `{}`)

#### constructor

Construct a new tracer for internal use only.  Use [GlobalTracer#init](#globaltracerinit) to set global trace options.

**Parameters**

-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** options used to initialize tracer (optional, default `{}`)
    -   `options.multiEvent` **bool?** true for multi-event mode; otherwise, single-event mode
    -   `options.debug` **bool?** true for debug; otherwise, it is disabled
    -   `options.propagators` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String), [Propagators](#propagators)>?** optional propagators
    -   `options.serviceName` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)?** allows the configuration of the "service" tag for the entire Tracer if not
                                                specified here, can also be set using env variable "ctrace_service_name"

#### startSpan

Starts and returns a new Span representing a logical unit of work.

For example:

    // Start a new (parentless) root Span:
    let parent = tracer.startSpan('DoWork')

    // Start a new (child) Span:
    let child = tracer.startSpan('Subroutine', {
        childOf: parent,
    });

**Parameters**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the operation.
-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)?** the fields to set on the newly created span. (optional, default `{}`)
    -   `options.childOf` **([Span](#span) \| [SpanContext](#spancontext))?** a parent SpanContext (or Span,
               for convenience) that the newly-started span will be the child of
               (per REFERENCE_CHILD_OF). If specified, `fields.references` must
               be unspecified.
    -   `options.tags` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)&lt;[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String), [object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)>?** set of key-value pairs which will be set
               as tags on the newly created Span. Ownership of the object is
               passed to the created span for efficiency reasons (the caller
               should not modify this object after calling startSpan).

Returns **[Span](#span)** a new Span object.

#### inject

Injects the given SpanContext instance for cross-process propagation
within `carrier`. The expected type of `carrier` depends on the value of
\`format.

OpenTracing defines a common set of `format` values (see
FORMAT_TEXT_MAP, FORMAT_HTTP_HEADERS, and FORMAT_BINARY), and each has
an expected carrier type.

Consider this pseudocode example:

    var clientSpan = ...;
    ...
    // Inject clientSpan into a text carrier.
    var headersCarrier = {};
    Tracer.inject(clientSpan.context(), Tracer.FORMAT_HTTP_HEADERS, headersCarrier);
    // Incorporate the textCarrier into the outbound HTTP request header
    // map.
    Object.assign(outboundHTTPReq.headers, headersCarrier);
    // ... send the httpReq

**Parameters**

-   `spanContext` **[SpanContext](#spancontext)** the SpanContext to inject into the
            carrier object. As a convenience, a Span instance may be passed
            in instead (in which case its .context() is used for the
            inject()).
-   `format` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the format of the carrier.
-   `carrier` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** see the documentation for the chosen `format`
            for a description of the carrier object.

#### extract

Returns a SpanContext instance extracted from `carrier` in the given
`format`.

OpenTracing defines a common set of `format` values (see
FORMAT_TEXT_MAP, FORMAT_HTTP_HEADERS, and FORMAT_BINARY), and each has
an expected carrier type.

Consider this pseudocode example:

    // Use the inbound HTTP request's headers as a text map carrier.
    var headersCarrier = inboundHTTPReq.headers;
    var wireCtx = Tracer.extract(Tracer.FORMAT_HTTP_HEADERS, headersCarrier);
    var serverSpan = Tracer.startSpan('...', { childOf : wireCtx });

**Parameters**

-   `format` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the format of the carrier.
-   `carrier` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** the type of the carrier object is determined by
            the format.

Returns **[SpanContext](#spancontext)** The extracted SpanContext, or undefined if no such SpanContext could
        be found in `carrier`

## Roadmap

-   [x] Core Start, Log, and Finish Span
-   [x] Inject, Extract to Text and Header formats
-   [ ] Inject, Extract to Binary format
-   [x] Express Middleware support
-   [x] Request and Request-Promise interceptor support
-   [ ] Kinesis, Lambda and Plain Lambda wrapper support
-   [ ] API Gateway / Lambda in Proxy Mode support

[ci-img]: https://travis-ci.org/Nordstrom/ctrace-js.svg?branch=new

[ci]: https://travis-ci.org/Nordstrom/ctrace-js

[cov-img]: https://coveralls.io/repos/github/Nordstrom/ctrace-js/badge.svg?branch=new

[cov]: https://coveralls.io/github/Nordstrom/ctrace-js?branch=new

[npm-img]: https://img.shields.io/npm/v/ctrace-js.svg

[npm]: https://www.npmjs.com/package/ctrace-js

[ot-img]: https://img.shields.io/badge/OpenTracing--1.0-enabled-blue.svg

[ot-url]: http://opentracing.io
