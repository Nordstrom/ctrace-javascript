'use strict'

const stringify = JSON.stringify

class JsonWriter {
  constructor (stream) {
    this.stream = stream || process.stdout
  }

  start (f) {
    this.prefix = f.parentId
      ? `{"traceId":"${f.traceId}","spanId":"${f.spanId}","parentId":"${f.parentId}","operation":"${f.operation}","start":${f.start}`
      : `{"traceId":"${f.traceId}","spanId":"${f.spanId}","operation":"${f.operation}","start":${f.start}`

    const tags = f.tags ? ',"tags":' + stringify(f.tags) : ''
    const lg = `,"log":{"event":"${f.log.event}","timestamp":${f.log.timestamp}}}\n`

    this.stream.write(this.prefix + tags + lg)
  }

  log (f) {
    const tags = f.tags ? ',"tags":' + stringify(f.tags) : ''
    const lg = ',"log":' + stringify(f.log) + '}\n'

    this.stream.write(this.prefix + tags + lg)
  }

  finish (f) {
    this.prefix += `,"duration":${f.duration}`
    const tags = f.tags ? ',"tags":' + stringify(f.tags) : ''
    const lg = `,"log":{"event":"Finish-Span","timestamp":${f.log.timestamp}}}\n`

    this.stream.write(this.prefix + tags + lg)
  }
}

module.exports = JsonWriter
