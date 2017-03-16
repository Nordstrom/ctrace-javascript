'use strict'

class Reporter {
  constructor (encoder, stream) {
    this.encoder = encoder
    this.stream = stream || process.stdout
  }

  report (span) {
    let encoded = this.encoder.encode(span)
    this.stream.write(encoded)
  }
}

module.exports = Reporter
