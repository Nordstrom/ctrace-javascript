'use strict'

const opentracing = require('opentracing')
const Tracer = require('./lib/tracer.js')

module.exports = Object.assign(Tracer, opentracing)
