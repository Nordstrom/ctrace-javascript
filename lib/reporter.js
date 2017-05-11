'use strict'

class Reporter {
  constructor (encoder, stream) {
    this.encoder = encoder
    // this.stream = stream || process.stdout
    this.stream = stream
  }

  report (span) {
    let encoded = this.encoder.encode(span)
    if (this.stream) {
      this.stream.write(encoded)
    } else {
      console.log(encoded)
    }
  }
}

module.exports = Reporter
