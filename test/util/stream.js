'use strict'

class Stream {
  constructor () {
    this.buf = []
  }
  write (v) {
    this.buf.push(v)
  }
}

module.exports = Stream
