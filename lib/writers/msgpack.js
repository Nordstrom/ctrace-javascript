'use strict'

const msgpack = require('msgpack')

class MsgpackWriter {
  constructor (stream) {
    this.stream = stream || process.stdout
  }

  start (f) {
    this.stream.write(msgpack.pack(f))
  }

  log (f) {
    this.stream.write(msgpack.pack(f))
  }

  finish (f) {
    this.stream.write(msgpack.pack(f))
  }
}

module.exports = MsgpackWriter
