'use strict'

const stringify = JSON.stringify

class Encoder {
  encode (sp) {
    let prefix

    if (sp.parentId && sp.duration >= 0) {
      prefix = `{"traceId":"${sp.traceId}","spanId":"${sp.spanId}","parentId":"${sp.parentId}","operation":"${sp.operation}","start":${sp.start},"duration":${sp.duration}`
    } else if (sp.parentId) {
      prefix = `{"traceId":"${sp.traceId}","spanId":"${sp.spanId}","parentId":"${sp.parentId}","operation":"${sp.operation}","start":${sp.start}`
    } else if (sp.duration >= 0) {
      prefix = `{"traceId":"${sp.traceId}","spanId":"${sp.spanId}","operation":"${sp.operation}","start":${sp.start},"duration":${sp.duration}`
    } else {
      prefix = `{"traceId":"${sp.traceId}","spanId":"${sp.spanId}","operation":"${sp.operation}","start":${sp.start}`
    }

    let tags = ''
    let logs = ''
    let baggage = ''

    if (sp.tags) {
      tags = `,"tags":${stringify(sp.tags)}`
    }

    if (sp.logs) {
      logs = `,"logs":${stringify(sp.logs)}`
    }

    if (sp.baggage) {
      baggage = `,"baggage":${stringify(sp.baggage)}`
    }

    return `${prefix}${tags}${logs}${baggage}}`
  }
}

module.exports = new Encoder()
