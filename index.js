'use strict'

const opentracing = require('opentracing')
const Tracer = require('./lib/tracer.js')

module.exports = Object.assign(Tracer, opentracing)
module.exports.express = require('./lib/middleware/express.js')
module.exports.request = require('./lib/middleware/request.js')
