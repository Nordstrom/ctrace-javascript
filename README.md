# ctrace-js
[![Build Status](https://travis-ci.org/Nordstrom/ctrace-js.svg?branch=master)](https://travis-ci.org/Nordstrom/ctrace-js)
[![Standard - JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](http://standardjs.com/)

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

* **[new Tracer (options)](#new-tracer-options)**
* **[tracer.startSpan (name, fields)](#tracerstartspan-name-fields)**
* **[tracer.inject (spanContext, format, carrier)](#tracerinject-spancontext-format-carrier)**
* **[tracer.extract (format, carrier)](#tracerextract-format-carrier)**
* **[span.log (keyValues, [timestamp])](#spanlog-keyvalues--timestamp)**
* **[span.addTags (keyValues)](#spanaddtags-keyvalues)**
* **[span.finish ([timestamp])](#spanfinish--timestamp)**

### new Tracer (options)
Create a new Tracer instance.  Ideally this should be done once for each application.

#### options
Type: `Object`

##### options.stream
Type: `WritableStream`  Default: `process.stdout`

Output stream.  All tracing events are written to this stream.

##### options.debug
Type: `bool`   Default: `false`

If set to `true`, all span.log events that have a key/value debug=true will be written to output.  Otherwise,
these logs will not be written.

### tracer.startSpan (name, [fields])
Starts and returns a new Span representing a logical unit of work.
For example:

```js
// Start a new (parentless) root Span:
const parent = tracer.startSpan('DoWork');
// Start a new (child) Span:
const child = tracer.startSpan('Subroutine',
  childOf: parent,
 });
```

#### name
Type: `string`

The name of the operation.

#### [fields]
Type: `object`

The fields to set on the newly created span.

##### [fields.childOf]
Type: `object`

A parent SpanContext (or Span, for convenience) that the newly-started span
will be the child of (per REFERENCE_CHILD_OF).

##### [fields.tags]
Type: `object`

Set of key-value pairs which will be set
as tags on the newly created Span. Ownership of the object is
passed to the created span for efficiency reasons (the caller
should not modify this object after calling startSpan).


### tracer.inject (spanContext, format, carrier)
Injects the given SpanContext instance for cross-process propagation
within `carrier`. The expected type of `carrier` depends on the value of `format`.

OpenTracing defines a common set of `format` values (see
FORMAT_TEXT_MAP, FORMAT_HTTP_HEADERS, and FORMAT_BINARY), and each has
an expected carrier type.
Consider this pseudocode example:

```js
const clientSpan = ...
...
// Inject clientSpan into a text carrier.
const headersCarrier = {}
tracer.inject(clientSpan.context(), Tracer.FORMAT_HTTP_HEADERS, headersCarrier)
// Incorporate the textCarrier into the outbound HTTP request header
// map.
Object.assign(outboundHTTPReq.headers, headersCarrier)
// ... send the httpReq
```

#### spanContext
Type: `object`

The SpanContext to inject into the
carrier object. As a convenience, a Span instance may be passed
in instead (in which case its .context() is used for the
inject()).

#### format
Type: `string`

The format of the carrier.

#### carrier
Type: `object`

See the documentation for the chosen `format`
for a description of the carrier object.

### tracer.extract (format, carrier)
Returns a SpanContext instance extracted from `carrier` in the given `format`.
OpenTracing defines a common set of `format` values (see
FORMAT_TEXT_MAP, FORMAT_HTTP_HEADERS, and FORMAT_BINARY), and each has
an expected carrier type.

Consider this pseudocode example:
```js
 // Use the inbound HTTP request's headers as a text map carrier.
 var headersCarrier = inboundHTTPReq.headers;
 var wireCtx = tracer.extract(Tracer.FORMAT_HTTP_HEADERS, headersCarrie)
 var serverSpan = tracer.startSpan('...', { childOf : wireCtx })
 ```

#### format
Type: `string`

The format of the carrier.

#### carrier
Type: `object`
The type of the carrier object is determined by the format.

### span.log (keyValues, [timestamp])
Add a log record to this Span, optionally at a user-provided timestamp.
For example:

```js
span.log({
  event: 'log event name'
  size: rpc.size(),  // numeric value
  URI: rpc.URI(),  // string value
  payload: rpc.payload(),  // Object value
  'keys can be arbitrary strings': rpc.foo(),
});

```

#### keyValuePairs
Type: `object`

An object mapping string keys to arbitrary value types. All
Tracer implementations should support bool, string, and numeric
value types, and some may also support Object values.

#### [timestamp]
Type: `number`

An optional parameter specifying the timestamp in milliseconds
since the Unix epoch. Fractional values are allowed so that
timestamps with sub-millisecond accuracy can be represented. If
not specified, the implementation is expected to use its notion
of the current time of the call.

### span.addTags (keyValues)
Adds the given key value pairs to the set of span tags.
Multiple calls to addTags() results in the tags being the superset of
all calls.
The behavior of setting the same key multiple times on the same span
is undefined.
The supported type of the values is implementation-dependent.
Implementations are expected to safely handle all types of values but
may choose to ignore unrecognized / unhandle-able values (e.g. objects
with cyclic references, function objects).

### span.finish([timestamp])
Sets the end timestamp and finalizes Span state.
With the exception of calls to Span.context() (which are always allowed),
finish() must be the last call made to any span instance, and to do
otherwise leads to undefined behavior.

#### [timestamp]
Type: `number`

Optional finish time in milliseconds as a Unix timestamp. Decimal
values are supported for timestamps with sub-millisecond accuracy.
If not specified, the current time (as defined by the
implementation) will be used.
