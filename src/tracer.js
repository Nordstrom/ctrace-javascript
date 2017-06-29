import {FORMAT_HTTP_HEADERS, FORMAT_TEXT_MAP} from 'opentracing'
import Span from './span.js'
import Reporter from './reporter.js'
import Encoder from './encoder.js'
import {randomBytes as rb} from 'crypto'
import TextPropagator from './propagators/textPropagator'

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
 * Tracer is the tracing entry-point.  It facilitates starting a new span and
 * context propagation (ie. inject, extract).
 */
export default class Tracer {
  /**
   * Construct a new tracer for internal use only.  Use {@link GlobalTracer#init} to set global trace options.
   *
   * @param {object} options - options used to initialize tracer
   * @param {bool} [options.multiEvent] - true for multi-event mode; otherwise, single-event mode
   * @param {bool} [options.debug] - true for debug; otherwise, it is disabled
   * @param {object.<string, Propagators>} [options.propagators] - optional propagators
   */
  constructor (options = {}) {
    this._reporter = options.reporter || new Reporter(Encoder, options.stream)
    this.multiEvent = options.multiEvent || false
    this.debug = options.debug || false
    this._propagation = {}

    if (!options.replacePropagators) {
      this._propagation[FORMAT_HTTP_HEADERS] = [new TextPropagator()]
      this._propagation[FORMAT_TEXT_MAP] = [new TextPropagator()]
    }

    const props = options.propagators
    if (props) {
      for (let key of Object.keys(props)) {
        let list = this._propagation[key]
        this._propagation[key] = (list || []).concat(props[key])
      }
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
   *     let parent = tracer.startSpan('DoWork')
   *
   *     // Start a new (child) Span:
   *     let child = tracer.startSpan('Subroutine', {
   *         childOf: parent,
   *     });
   *
   * @param {string} name - the name of the operation.
   * @param {object} [options] - the fields to set on the newly created span.
   * @param {Span|SpanContext} [options.childOf] - a parent SpanContext (or Span,
   *        for convenience) that the newly-started span will be the child of
   *        (per REFERENCE_CHILD_OF). If specified, `fields.references` must
   *        be unspecified.
   * @param {object.<string, object>} [options.tags] - set of key-value pairs which will be set
   *        as tags on the newly created Span. Ownership of the object is
   *        passed to the created span for efficiency reasons (the caller
   *        should not modify this object after calling startSpan).
   * @return {Span} a new Span object.
   */
  startSpan (name, options = {}) {
    const now = Date.now() * 1000
    let ref = (options.childOf && options.childOf._fields) || options.childOf

    const spanId = genId()

    let traceId = spanId
    let parentId
    let baggage

    if (ref && ref.traceId && ref.spanId) {
      traceId = ref.traceId
      parentId = ref.spanId
    }

    if (ref && ref.baggage) {
      baggage = ref.baggage
    }

    let f

    if (parentId) {
      f = {
        traceId: traceId,
        spanId: spanId,
        parentId: parentId,
        operation: name,
        start: now
      }
    } else {
      f = {
        traceId: traceId,
        spanId: spanId,
        operation: name,
        start: now
      }
    }

    f.debug = options.debug || false
    f.operation = name
    f.start = now

    if (options.tags) {
      f.tags = options.tags
    }

    if (baggage) {
      f.baggage = baggage
    }

    f.logs = [{
      timestamp: now,
      event: 'Start-Span'
    }]

    if (this.multiEvent) {
      this._reporter.report(f)
    }
    return new Span(this, f)
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
   * @param  {object} carrier - see the documentation for the chosen `format`
   *         for a description of the carrier object.
   */
  inject (spanContext, format, carrier) {
    const propagation = this._propagation[format]
    for (let prop of propagation) {
      prop.inject && prop.inject(spanContext, carrier)
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
   * @param  {object} carrier - the type of the carrier object is determined by
   *         the format.
   * @return {SpanContext} - The extracted SpanContext, or undefined if no such SpanContext could
   *         be found in `carrier`
   */
  extract (format, carrier) {
    const propagation = this._propagation[format]
    for (let prop of propagation) {
      let ctx = prop.extract && prop.extract(carrier)
      if (ctx) return ctx
    }
    return undefined
  }

  report (fields) {
    return this._reporter.report(fields)
  }

  static genId () {
    const buf = rb(8)
    let i = 0
    return bth[buf[i++]] + bth[buf[i++]] +
      bth[buf[i++]] + bth[buf[i++]] +
      bth[buf[i++]] + bth[buf[i++]] +
      bth[buf[i++]] + bth[buf[i++]]
  }
}
