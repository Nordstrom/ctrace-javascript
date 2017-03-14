'use strict'

const should = require('should')

// usage: logRecord.should.have.tag(component, 'ExampleComponent')
should.Assertion.add('tag', function (tagName, tagVal) {
  this.params = {
    operator: `to have tags[${tagName}]${tagVal ? ' = ' + tagVal : ''}`
  }

  this.obj.should.have.property('tags').which.is.an.Object()
  let tags = this.obj.tags

  // check tag value if defined
  if (arguments.length > 1) {
    tags.should.have.properties({ [tagName]: tagVal })
  } else {
    tags.should.have.properties(tagName)
  }
  // this.obj is now value of tag
  this.obj = this.obj.tags[tagName]
}, false)
