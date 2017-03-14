'use strict'

class Stream {
  constructor () {
    this.buf = []
  }
  write (v) {
    this.buf.push(v)
  }
  getJSON (idx) {
    return JSON.parse(this.buf[idx])
  }
}

module.exports = Stream
