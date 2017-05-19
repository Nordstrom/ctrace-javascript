'use strict'

const opentracing = require('opentracing')
const request = require('request-promise')
const tracer = require('./lib/tracer.js')

tracer.init(request)

module.exports = Object.assign(tracer, opentracing)
module.exports.express = require('./lib/middleware/express.js')
module.exports.request = require('./lib/middleware/request.js')

