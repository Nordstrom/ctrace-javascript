'use strict'

const opentracing = require('opentracing')
const Span = require('./span.js')

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
    if (opts.writer) {
      this._writer = opts.writer
    } else {
      const JsonWriter = require('./writers/json.js')
      this._writer = new JsonWriter(opts.stream || process.stdout)
    }

    this._debug = opts.debug
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
    return new Span(this, name, fields)
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
    if (format === opentracing.FORMAT_HTTP_HEADERS) {
      carrier['X-Correlation-ID'] = spanContext.traceId
      carrier['X-Request-ID'] = spanContext.spanId
      // todo: add baggage
    }
  }

  /**
   * Returns a SpanContext instance extracted from `carrier` in the given
   * `format`.
   *
   * OpenTracing defines a common set of `format` values (see
   * FORMAT_TEXT_MAP, FORMAT_HTTP_HEADERS, and FORMAT_BINARY), and each has=
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
    if (format === opentracing.FORMAT_HTTP_HEADERS) {
      // todo: add baggage
      let ctx = {
        traceId: carrier['X-Correlation-ID'] || carrier['x-correlation-id'] || carrier['X-Correlation-Id'],
        spanId: carrier['X-Request-ID'] || carrier['x-request-id'] || carrier['X-Request-Id']
      }
      return ctx.traceId && ctx.spanId && ctx
    }
  }
}

module.exports = Tracer
