'use strict'

const opentracing = require('opentracing')
const Tracer = require('./lib/tracer.js')
const express = require('./lib/middleware/express.js')

module.exports = Object.assign(Tracer, opentracing)
module.exports.express = express
