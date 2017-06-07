export default class Reporter {
  constructor (encoder, stream) {
    this.encoder = encoder
    this.stream = stream
  }

  report (spanFields) {
    let encoded = this.encoder.encode(spanFields)
    if (this.stream) {
      this.stream.write(encoded)
    } else {
      console.log(encoded)
    }
  }
}
