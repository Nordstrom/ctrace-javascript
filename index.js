'use strict'

const opentracing = require('opentracing')
const tracer = require('./lib/tracer.js')

module.exports = Object.assign(tracer, opentracing)
module.exports.express = require('./lib/middleware/express.js')
module.exports.request = require('./lib/middleware/request.js')
