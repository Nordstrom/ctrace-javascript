'use strict'

const split = require('split2')
const parse = require('fast-json-parse')

process.stdin.pipe(split(
  line => {
    const parsed = parse(line)
    if (parsed.err) return line + '\n'
    return JSON.stringify(parsed.value, null, 2) + '\n'
  }
)).pipe(process.stdout)
