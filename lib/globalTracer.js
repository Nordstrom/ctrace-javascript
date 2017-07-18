'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var cov_2ekytm5cid = function () {
  var path = '/Users/x1vz/nord-repos/ctrace-js/src/globalTracer.js',
      hash = '6fd67061a330afde9251145a08d287a8a552f526',
      global = new Function('return this')(),
      gcv = '__coverage__',
      coverageData = {
    path: '/Users/x1vz/nord-repos/ctrace-js/src/globalTracer.js',
    statementMap: {
      '0': {
        start: {
          line: 10,
          column: 4
        },
        end: {
          line: 10,
          column: 31
        }
      },
      '1': {
        start: {
          line: 17,
          column: 4
        },
        end: {
          line: 17,
          column: 48
        }
      },
      '2': {
        start: {
          line: 21,
          column: 4
        },
        end: {
          line: 21,
          column: 53
        }
      },
      '3': {
        start: {
          line: 25,
          column: 4
        },
        end: {
          line: 25,
          column: 48
        }
      },
      '4': {
        start: {
          line: 37,
          column: 4
        },
        end: {
          line: 37,
          column: 38
        }
      }
    },
    fnMap: {
      '0': {
        name: '(anonymous_0)',
        decl: {
          start: {
            line: 9,
            column: 2
          },
          end: {
            line: 9,
            column: 3
          }
        },
        loc: {
          start: {
            line: 9,
            column: 17
          },
          end: {
            line: 11,
            column: 3
          }
        },
        line: 9
      },
      '1': {
        name: '(anonymous_1)',
        decl: {
          start: {
            line: 16,
            column: 2
          },
          end: {
            line: 16,
            column: 3
          }
        },
        loc: {
          start: {
            line: 16,
            column: 28
          },
          end: {
            line: 18,
            column: 3
          }
        },
        line: 16
      },
      '2': {
        name: '(anonymous_2)',
        decl: {
          start: {
            line: 20,
            column: 2
          },
          end: {
            line: 20,
            column: 3
          }
        },
        loc: {
          start: {
            line: 20,
            column: 40
          },
          end: {
            line: 22,
            column: 3
          }
        },
        line: 20
      },
      '3': {
        name: '(anonymous_3)',
        decl: {
          start: {
            line: 24,
            column: 2
          },
          end: {
            line: 24,
            column: 3
          }
        },
        loc: {
          start: {
            line: 24,
            column: 28
          },
          end: {
            line: 26,
            column: 3
          }
        },
        line: 24
      },
      '4': {
        name: '(anonymous_4)',
        decl: {
          start: {
            line: 36,
            column: 2
          },
          end: {
            line: 36,
            column: 3
          }
        },
        loc: {
          start: {
            line: 36,
            column: 17
          },
          end: {
            line: 38,
            column: 3
          }
        },
        line: 36
      }
    },
    branchMap: {},
    s: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0
    },
    f: {
      '0': 0,
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0
    },
    b: {},
    _coverageSchema: '332fd63041d2c1bcb487cc26dd0d5f7d97098a6c'
  },
      coverage = global[gcv] || (global[gcv] = {});

  if (coverage[path] && coverage[path].hash === hash) {
    return coverage[path];
  }

  coverageData.hash = hash;
  return coverage[path] = coverageData;
}();

var _tracer = require('./tracer');

var _tracer2 = _interopRequireDefault(_tracer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Global tracer singleton.  This is accessed as follows.
 *
 *     const tracer = require('ctrace')
 */
class GlobalTracer {
  constructor() {
    ++cov_2ekytm5cid.f[0];
    ++cov_2ekytm5cid.s[0];

    this._tracer = new _tracer2.default();
  }

  /**
   * Singleton wrapper for {@link Tracer#startSpan}
   */
  startSpan(name, context) {
    ++cov_2ekytm5cid.f[1];
    ++cov_2ekytm5cid.s[1];

    return this._tracer.startSpan(name, context);
  }

  inject(spanContext, format, carrier) {
    ++cov_2ekytm5cid.f[2];
    ++cov_2ekytm5cid.s[2];

    this._tracer.inject(spanContext, format, carrier);
  }

  extract(format, carrier) {
    ++cov_2ekytm5cid.f[3];
    ++cov_2ekytm5cid.s[3];

    return this._tracer.extract(format, carrier);
  }

  /**
   * Used to initialize global tracer singleton
   *
   * @param {object} options - options used to initialize tracer
   * @param {bool} [options.multiEvent] - true for multi-event mode; otherwise, single-event mode
   * @param {bool} [options.debug] - true for debug; otherwise, it is disabled
   * @param {Object.<string, Propagators>} [options.propagators] - optional propagators
   */
  init(options) {
    ++cov_2ekytm5cid.f[4];
    ++cov_2ekytm5cid.s[4];

    this._tracer = new _tracer2.default(options);
  }
}
exports.default = GlobalTracer;
module.exports = exports['default'];