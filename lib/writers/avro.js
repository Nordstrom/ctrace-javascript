'use strict'

const avro = require('avsc')
const avroLog = avro.parse({
  name: 'Log',
  type: 'record',
  fields: [
    {name: 'traceId', type: 'string'},
    {name: 'spanId', type: 'string'},
    {name: 'parentId', type: 'string', default: ''},
    {name: 'operation', type: 'string'},
    {name: 'start', type: 'long'},
    {name: 'duration', type: 'long', default: 0},
    {name: 'tags', type: {type: 'map', values: ['string', 'long']}},
    {name: 'log', type: {type: 'map', values: ['string', 'long']}}
  ]
})

class AvroWriter {
  constructor (stream) {
    this.stream = stream || process.stdout
  }

  start (f) {
    this.stream.write(avroLog.toBuffer(f))
  }

  log (f) {
    this.stream.write(avroLog.toBuffer(f))
  }

  finish (f) {
    this.stream.write(avroLog.toBuffer(f))
  }
}

module.exports = AvroWriter
