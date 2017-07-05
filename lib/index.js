'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var cov_km0f6rmf4 = function () {
  var path = '/Users/x1vz/nord-repos/ctrace-js/src/index.js',
      hash = 'c07eb3accd641c342673812164da1653250bfa3b',
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: '/Users/x1vz/nord-repos/ctrace-js/src/index.js',
    statementMap: {
      '0': {
        start: {
          line: 6,
          column: 15
        },
        end: {
          line: 6,
          column: 61
        }
      },
      '1': {
        start: {
          line: 7,
          column: 0
        },
        end: {
          line: 7,
          column: 24
        }
      },
      '2': {
        start: {
          line: 8,
          column: 0
        },
        end: {
          line: 8,
          column: 24
        }
      },
      '3': {
        start: {
          line: 11,
          column: 2
        },
        end: {
          line: 18,
          column: 3
        }
      },
      '4': {
        start: {
          line: 12,
          column: 4
        },
        end: {
          line: 16,
          column: 5
        }
      },
      '5': {
        start: {
          line: 13,
          column: 6
        },
        end: {
          line: 13,
          column: 49
        }
      },
      '6': {
        start: {
          line: 14,
          column: 11
        },
        end: {
          line: 16,
          column: 5
        }
      },
      '7': {
        start: {
          line: 15,
          column: 6
        },
        end: {
          line: 15,
          column: 49
        }
      },
      '8': {
        start: {
          line: 17,
          column: 4
        },
        end: {
          line: 17,
          column: 69
        }
      },
      '9': {
        start: {
          line: 20,
          column: 0
        },
        end: {
          line: 20,
          column: 29
        }
      },
      '10': {
        start: {
          line: 21,
          column: 0
        },
        end: {
          line: 21,
          column: 27
        }
      },
      '11': {
        start: {
          line: 22,
          column: 0
        },
        end: {
          line: 22,
          column: 27
        }
      },
      '12': {
        start: {
          line: 23,
          column: 0
        },
        end: {
          line: 23,
          column: 29
        }
      }
    },
    fnMap: {
      '0': {
        name: 'logFn',
        decl: {
          start: {
            line: 10,
            column: 9
          },
          end: {
            line: 10,
            column: 14
          }
        },
        loc: {
          start: {
            line: 10,
            column: 23
          },
          end: {
            line: 19,
            column: 1
          }
        },
        line: 10
      },
      '1': {
        name: 'log',
        decl: {
          start: {
            line: 11,
            column: 18
          },
          end: {
            line: 11,
            column: 21
          }
        },
        loc: {
          start: {
            line: 11,
            column: 41
          },
          end: {
            line: 18,
            column: 3
          }
        },
        line: 11
      }
    },
    branchMap: {
      '0': {
        loc: {
          start: {
            line: 12,
            column: 4
          },
          end: {
            line: 16,
            column: 5
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 12,
            column: 4
          },
          end: {
            line: 16,
            column: 5
          }
        }, {
          start: {
            line: 12,
            column: 4
          },
          end: {
            line: 16,
            column: 5
          }
        }],
        line: 12
      },
      '1': {
        loc: {
          start: {
            line: 14,
            column: 11
          },
          end: {
            line: 16,
            column: 5
          }
        },
        type: 'if',
        locations: [{
          start: {
            line: 14,
            column: 11
          },
          end: {
            line: 16,
            column: 5
          }
        }, {
          start: {
            line: 14,
            column: 11
          },
          end: {
            line: 16,
            column: 5
          }
        }],
        line: 14
      }
    },
    s: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0,
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
      '12': 0
    },
    f: {
      '0': 0,
      '1': 0
    },
    b: {
      '0': [0, 0],
      '1': [0, 0]
    },
    _coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
  },
      coverage = global[gcv] || (global[gcv] = {});

  if (coverage[path] && coverage[path].hash === hash) {
    return coverage[path];
  }

  coverageData.hash = hash;
  return coverage[path] = coverageData;
}();

var _opentracing = require('opentracing');

var opentracing = _interopRequireWildcard(_opentracing);

var _globalTracer = require('./globalTracer');

var _globalTracer2 = _interopRequireDefault(_globalTracer);

var _express = require('./middleware/express');

var _express2 = _interopRequireDefault(_express);

var _request = require('./middleware/request');

var _request2 = _interopRequireDefault(_request);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

const tracer = (++cov_km0f6rmf4.s[0], Object.assign(new _globalTracer2.default(), opentracing));
++cov_km0f6rmf4.s[1];
tracer.express = _express2.default;
++cov_km0f6rmf4.s[2];
tracer.request = _request2.default;

function logFn(level) {
  ++cov_km0f6rmf4.f[0];
  ++cov_km0f6rmf4.s[3];

  return function log(ctx, event, data) {
    ++cov_km0f6rmf4.f[1];
    ++cov_km0f6rmf4.s[4];

    if (level === 'debug') {
      ++cov_km0f6rmf4.b[0][0];
      ++cov_km0f6rmf4.s[5];

      data = Object.assign({ debug: true }, data);
    } else {
        ++cov_km0f6rmf4.b[0][1];
        ++cov_km0f6rmf4.s[6];
        if (level === 'error') {
          ++cov_km0f6rmf4.b[1][0];
          ++cov_km0f6rmf4.s[7];

          data = Object.assign({ error: true }, data);
        } else {
          ++cov_km0f6rmf4.b[1][1];
        }
      }++cov_km0f6rmf4.s[8];
    ctx.span.log(Object.assign({ event: event, level: level }, data));
  };
}
++cov_km0f6rmf4.s[9];
tracer.debug = logFn('debug');
++cov_km0f6rmf4.s[10];
tracer.info = logFn('info');
++cov_km0f6rmf4.s[11];
tracer.warn = logFn('warn');
++cov_km0f6rmf4.s[12];
tracer.error = logFn('error');

exports.default = tracer;
module.exports = exports['default'];