'use strict'
const opentracing = require('opentracing')

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
 * Span represents a logical unit of work as part of a broader Trace. Examples
 * of span might include remote procedure calls or a in-process function calls
 * to sub-components. A Trace has a single, top-level "root" Span that in turn
 * may have zero or more child Spans, which in turn may have children.
 */
class Span extends opentracing.Span {
  /**
   * Construct a new span.  This should always be done using the Tracer.startSpan
   * function.
   *
   * @param {Tracer} tracer
   *        Handles the serilaization and writing
   * @param {string} operation
   *        Operation name
   * @param {object} fields
   *        Fields from parent context
   */
  constructor (tracer, operation, fields) {
    super()
    const self = this
    self._tracer = tracer
    self._writer = tracer._writer

    if (!fields) fields = {}

    const now = Date.now()
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

    f.operation = operation
    f.start = now

    if (fields.tags) {
      f.tags = fields.tags
    }

    if (fields.baggage) {
      f.baggage = baggage
    }

    f.log = {event: 'Start-Span', timestamp: now}

    self._fields = f
    self._writer.start(f)
  }

  // ---------------------------------------------------------------------- //
  // OpenTracing API methods
  // ---------------------------------------------------------------------- //

  /**
   * Returns the SpanContext object associated with this Span.
   *
   * @return {SpanContext}
   */
  context () {
    return this._fields
  }

  /**
   * Returns the Tracer object used to create this Span.
   *
   * @return {Tracer}
   */
  tracer () {
    return this._tracer
  }

  /**
   * Sets the string name for the logical operation this span represents.
   *
   * @param {string} name
   */
  setOperationName (name) {
    this._fields.operation = name
    return this
  }

  /**
   * Sets a key:value pair on this Span that also propagates to future
   * children of the associated Span.
   *
   * setBaggageItem() enables powerful functionality given a full-stack
   * opentracing integration (e.g., arbitrary application data from a web
   * client can make it, transparently, all the way into the depths of a
   * storage system), and with it some powerful costs: use this feature with
   * care.
   *
   * IMPORTANT NOTE #1: setBaggageItem() will only propagate baggage items to
   * *future* causal descendants of the associated Span.
   *
   * IMPORTANT NOTE #2: Use this thoughtfully and with care. Every key and
   * value is copied into every local *and remote* child of the associated
   * Span, and that can add up to a lot of network and cpu overhead.
   *
   * @param {string} key
   * @param {string} value
   */
  setBaggageItem (key, value) {
    if (!this._fields.baggage) this._fields.baggage = {}
    this._fields.baggage[key] = value
    return this
  }

  /**
   * Returns the value for a baggage item given its key.
   *
   * @param  {string} key
   *         The key for the given trace attribute.
   * @return {string}
   *         String value for the given key, or undefined if the key does not
   *         correspond to a set trace attribute.
   */
  getBaggageItem (key) {
    return this._fields.baggage && this._fields.baggage[key]
  }

  /**
   * Adds a single tag to the span.  See `addTags()` for details.
   *
   * @param {string} key
   * @param {any} value
   */
  setTag (key, value) {
      // NOTE: the call is normalized to a call to _addTags()
    this.addTags({ [key]: value })
    return this
  }

  /**
   * Adds the given key value pairs to the set of span tags.
   *
   * Multiple calls to addTags() results in the tags being the superset of
   * all calls.
   *
   * The behavior of setting the same key multiple times on the same span
   * is undefined.
   *
   * The supported type of the values is implementation-dependent.
   * Implementations are expected to safely handle all types of values but
   * may choose to ignore unrecognized / unhandle-able values (e.g. objects
   * with cyclic references, function objects).
   *
   * @return {[type]} [description]
   */
  addTags (keyValues) {
    const tags = this._fields.tags || {}
    for (let key in keyValues) {
      if (keyValues.hasOwnProperty(key)) tags[key] = keyValues[key]
    }
    this._fields.tags = tags
    return this
  }

  /**
   * Add a log record to this Span, optionally at a user-provided timestamp.
   *
   * For example:
   *
   *     span.log({
   *         size: rpc.size(),  // numeric value
   *         URI: rpc.URI(),  // string value
   *         payload: rpc.payload(),  // Object value
   *         "keys can be arbitrary strings": rpc.foo(),
   *     });
   *
   *     span.log({
   *         "error.description": someError.description(),
   *     }, someError.timestampMillis());
   *
   * @param {object} keyValuePairs
   *        An object mapping string keys to arbitrary value types. All
   *        Tracer implementations should support bool, string, and numeric
   *        value types, and some may also support Object values.
   * @param {number} timestamp
   *        An optional parameter specifying the timestamp in milliseconds
   *        since the Unix epoch. Fractional values are allowed so that
   *        timestamps with sub-millisecond accuracy can be represented. If
   *        not specified, the implementation is expected to use its notion
   *        of the current time of the call.
   */
  log (keyValues, timestamp) {
    if (!keyValues.timestamp) keyValues.timestamp = timestamp || Date.now()
    this._fields.log = keyValues
    this._writer.log(this._fields)
    return this
  }

  /**
   * Sets the end timestamp and finalizes Span state.
   *
   * With the exception of calls to Span.context() (which are always allowed),
   * finish() must be the last call made to any span instance, and to do
   * otherwise leads to undefined behavior.
   *
   * @param  {number} finishTime
   *         Optional finish time in milliseconds as a Unix timestamp. Decimal
   *         values are supported for timestamps with sub-millisecond accuracy.
   *         If not specified, the current time (as defined by the
   *         implementation) will be used.
   */
  finish (finishTime) {
    if (this._finished) return
    if (!finishTime) finishTime = Date.now()
    this._fields.duration = finishTime - this._fields.start
    this._fields.log = {
      event: 'Finish-Span',
      timestamp: finishTime
    }
    this._writer.finish(this._fields)
    this._finished = true
  }
}

module.exports = Span
