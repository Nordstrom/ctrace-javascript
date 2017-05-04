'use strict'

const opentracing = require('opentracing')
const Span = require('./span.js')
const Reporter = require('./reporter.js')
const encoder = require('./encoder.js')
const rb = require('crypto').randomBytes

const bth = []
for (var i = 0; i < 256; ++i) {
  bth[i] = (i + 0x100).toString(16).substr(1)
}

function genId () {
  const buf = rb(8)
  let i = 0
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]]
}

/**
 * Tracer is the entry-point between the instrumentation API and the tracing
 * implementation.
 *
 * The default object acts as a no-op implementation.
 *
 * Note to implementators: derived classes can choose to directly implement the
 * methods in the "OpenTracing API methods" section, or optionally the subset of
 * underscore-prefixed methods to pick up the argument checking and handling
 * automatically from the base class.
 */
class Tracer { // extends opentracing.Tracer {
  /**
   * Construct a new tracer.
   *
   * @param {object} opts
   */
  constructor (opts) {
    opts = opts || {}
    // TODO: Allow custom reporters?
    this._reporter = new Reporter(encoder, opts.stream)
    this._multiEvent = opts.multiEvent
    this._debug = opts.debug
    this._propagation = {}

    this._propagation[opentracing.FORMAT_HTTP_HEADERS] = {
      traceIdKey: 'ct-trace-id',
      spanIdKey: 'ct-span-id',
      baggagePrefix: 'ct-bag-',
      encodeValue: encodeURI,
      decodeValue: decodeURI
    }

    this._propagation[opentracing.FORMAT_TEXT_MAP] = {
      traceIdKey: 'ct-trace-id',
      spanIdKey: 'ct-span-id',
      baggagePrefix: 'ct-bag-',
      encodeValue: (v) => { return v },
      decodeValue: (v) => { return v }
    }
  }

  // ---------------------------------------------------------------------- //
  // OpenTracing API methods
  // ---------------------------------------------------------------------- //

  /**
   * Starts and returns a new Span representing a logical unit of work.
   *
   * For example:
   *
   *     // Start a new (parentless) root Span:
   *     var parent = Tracer.startSpan('DoWork');
   *
   *     // Start a new (child) Span:
   *     var child = Tracer.startSpan('Subroutine', {
   *         childOf: parent.context(),
   *     });
   *
   * @param {string} name - the name of the operation.
   * @param {object} [fields] - the fields to set on the newly created span.
   * @param {SpanContext} [fields.childOf] - a parent SpanContext (or Span,
   *        for convenience) that the newly-started span will be the child of
   *        (per REFERENCE_CHILD_OF). If specified, `fields.references` must
   *        be unspecified.
   * @param {object} [fields.tags] - set of key-value pairs which will be set
   *        as tags on the newly created Span. Ownership of the object is
   *        passed to the created span for efficiency reasons (the caller
   *        should not modify this object after calling startSpan).
   * @return {Span} - a new Span object.
   */
  startSpan (name, fields) {
    const span = new Span()
    span._tracer = this

    if (!fields) fields = {}

    const now = Date.now() * 1000
    const parent = (fields.childOf && fields.childOf._fields) || fields.childOf
    const spanId = genId()

    let traceId = spanId
    let parentId
    let baggage = fields.baggage

    if (parent && parent.traceId && parent.spanId) {
      traceId = parent.traceId
      parentId = parent.spanId
      baggage = parent.baggage
    }

    const f = {
      traceId: traceId,
      spanId: spanId
    }

    if (parentId) {
      f.parentId = parentId
    }

    f.operation = name
    f.start = now

    if (fields.tags) {
      f.tags = fields.tags
    }

    if (baggage) {
      f.baggage = baggage
    }

    f.logs = [{timestamp: now, event: 'Start-Span'}]

    span._fields = f

    if (this._multiEvent) {
      this._reporter.report(f)
    }
    return span
  }

  /**
   * Injects the given SpanContext instance for cross-process propagation
   * within `carrier`. The expected type of `carrier` depends on the value of
   * `format.
   *
   * OpenTracing defines a common set of `format` values (see
   * FORMAT_TEXT_MAP, FORMAT_HTTP_HEADERS, and FORMAT_BINARY), and each has
   * an expected carrier type.
   *
   * Consider this pseudocode example:
   *
   *     var clientSpan = ...;
   *     ...
   *     // Inject clientSpan into a text carrier.
   *     var headersCarrier = {};
   *     Tracer.inject(clientSpan.context(), Tracer.FORMAT_HTTP_HEADERS, headersCarrier);
   *     // Incorporate the textCarrier into the outbound HTTP request header
   *     // map.
   *     Object.assign(outboundHTTPReq.headers, headersCarrier);
   *     // ... send the httpReq
   *
   * @param  {SpanContext} spanContext - the SpanContext to inject into the
   *         carrier object. As a convenience, a Span instance may be passed
   *         in instead (in which case its .context() is used for the
   *         inject()).
   * @param  {string} format - the format of the carrier.
   * @param  {any} carrier - see the documentation for the chosen `format`
   *         for a description of the carrier object.
   */
  inject (spanContext, format, carrier) {
    const opts = this._propagation[format]
    if (!opts) return
    carrier[opts.traceIdKey] = spanContext.traceId
    carrier[opts.spanIdKey] = spanContext.spanId

    const baggage = spanContext.baggage
    if (!baggage) return
    for (let key in baggage) {
      if (!baggage.hasOwnProperty(key)) continue
      carrier[`${opts.baggagePrefix}${key}`] = opts.encodeValue(baggage[key])
    }
  }

  /**
   * Returns a SpanContext instance extracted from `carrier` in the given
   * `format`.
   *
   * OpenTracing defines a common set of `format` values (see
   * FORMAT_TEXT_MAP, FORMAT_HTTP_HEADERS, and FORMAT_BINARY), and each has
   * an expected carrier type.
   *
   * Consider this pseudocode example:
   *
   *     // Use the inbound HTTP request's headers as a text map carrier.
   *     var headersCarrier = inboundHTTPReq.headers;
   *     var wireCtx = Tracer.extract(Tracer.FORMAT_HTTP_HEADERS, headersCarrier);
   *     var serverSpan = Tracer.startSpan('...', { childOf : wireCtx });
   *
   * @param  {string} format - the format of the carrier.
   * @param  {any} carrier - the type of the carrier object is determined by
   *         the format.
   * @return {SpanContext}
   *         The extracted SpanContext, or null if no such SpanContext could
   *         be found in `carrier`
   */
  extract (format, carrier) {
    const opts = this._propagation[format]
    if (!opts) return
    let ctx = {
      traceId: carrier[opts.traceIdKey],
      spanId: carrier[opts.spanIdKey]
    }

    for (let key in carrier) {
      if (!carrier.hasOwnProperty(key)) continue
      if (!key.startsWith(opts.baggagePrefix)) continue
      if (!ctx.baggage) ctx.baggage = {}
      ctx.baggage[key.substring(opts.baggagePrefix.length)] = opts.decodeValue(carrier[key])
    }
    return ctx
  }
}

function init (opts) {
  opentracing.initGlobalTracer(new Tracer(opts))
}

init()

module.exports = opentracing.globalTracer()
module.exports.init = init
module.exports.Ctracer = Tracer
module.exports.genId = genId
