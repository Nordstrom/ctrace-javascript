'use strict'

const bufSize = 8192
const stringify = JSON.stringify

class Encoder {
  encode (sp) {
    let buffer = new Buffer(bufSize)
    let off = this.encodePrefix(sp, buffer)

    if (sp.duration >= 0) {
      off += buffer.write(',"duration":', off)
      off += buffer.write(sp.duration.toString(), off)
    }
    if (sp.tags) {
      off = this.encodeTags(sp.tags, buffer, off)
    }
    if (sp.logs) {
      off = this.encodeLogs(sp.logs, buffer, off)
    }
    if (sp.baggage) {
      off = this.encodeBaggage(sp.baggage, buffer, off)
    }
    off += buffer.write('}', off)
    return buffer.toString('utf8', 0, off)
  }

  encodePrefix (sp, buffer) {
    let len = buffer.write('{"traceId":"')
    len += buffer.write(sp.traceId, len)
    len += buffer.write('","spanId":"', len)
    len += buffer.write(sp.spanId, len)
    if (sp.parentId) {
      len += buffer.write('","parentId":"', len)
      len += buffer.write(sp.parentId, len)
    }
    len += buffer.write('","operation":', len)
    len += buffer.write(stringify(sp.operation), len)
    len += buffer.write(',"start":', len)
    len += buffer.write((sp.start * 1000).toString(), len)
    return len
  }

  encodeTags (tags, buffer, off) {
    if (!tags) return 0

    off += buffer.write(',"tags":{', off)

    let first = true
    for (let key in tags) {
      if (!tags.hasOwnProperty(key)) continue
      if (first) first = false
      else off += buffer.write(',', off)
      off += buffer.write(stringify(key), off)
      off += buffer.write(':', off)
      let val = tags[key]
      if ((typeof val) === 'string') {
        off += buffer.write(stringify(val), off)
      } else {
        off += buffer.write(val.toString(), off)
      }
    }

    off += buffer.write('}', off)
    return off
  }

  encodeLogs (logs, buffer, off) {
    if (!logs) return 0

    off += buffer.write(',"logs":[', off)

    let firstLog = true
    for (let i = 0; i < logs.length; i++) {
      let log = logs[i]
      if (firstLog) firstLog = false
      else off += buffer.write(',', off)
      let timestamp = (log.timestamp || Date.now()) * 1000
      off += buffer.write('{"timestamp":', off)
      off += buffer.write(timestamp.toString(), off)

      for (let key in log) {
        if (!log.hasOwnProperty(key)) continue
        if (key === 'timestamp') continue
        off += buffer.write(',', off)
        off += buffer.write(stringify(key), off)
        off += buffer.write(':', off)
        let val = log[key]
        if ((typeof val) === 'string') {
          off += buffer.write(stringify(val), off)
        } else {
          off += buffer.write(val.toString(), off)
        }
      }
      off += buffer.write('}', off)
    }
    off += buffer.write(']', off)
    return off
  }

  encodeBaggage (bag, buffer, off) {
    if (!bag) return 0

    off += buffer.write(',"baggage":{', off)

    let first = true
    for (let key in bag) {
      if (!bag.hasOwnProperty(key)) continue
      if (first) first = false
      else off += buffer.write(',', off)
      off += buffer.write(stringify(key), off)
      off += buffer.write(':', off)
      let val = bag[key]
      if ((typeof val) === 'string') {
        off += buffer.write(stringify(val), off)
      } else {
        off += buffer.write(val.toString(), off)
      }
    }

    off += buffer.write('}', off)
    return off
  }
}

module.exports = new Encoder()
