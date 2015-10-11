'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

require("babel/polyfill");
var a = require('array-tools');
var o = require('object-tools');
var Definitions = require('./definitions');
var option = require('./option');
var cliUsage = require('command-line-usage');
var findReplace = require('find-replace');
var t = require('typical');

module.exports = commandLineArgs;

var CommandLineArgs = (function () {
  function CommandLineArgs(definitions) {
    _classCallCheck(this, CommandLineArgs);

    this.definitions = new Definitions(definitions);
  }

  _createClass(CommandLineArgs, [{
    key: 'parse',
    value: function parse(argv) {
      var _this = this;

      argv = argv || process.argv;
      if (argv === process.argv) {
        argv.splice(0, 2);
      } else {
        argv = a.arrayify(argv);
      }

      var optEquals = option.optEquals;
      if (argv.some(optEquals.test.bind(optEquals))) {
        var expandedArgs = [];
        argv.forEach(function (arg) {
          var matches = arg.match(optEquals.re);
          if (matches) {
            expandedArgs.push(matches[1], matches[2]);
          } else {
            expandedArgs.push(arg);
          }
        });
        argv = expandedArgs;
      }

      var combinedArg = option.combined;
      var hasGetopt = argv.some(combinedArg.test.bind(combinedArg));
      if (hasGetopt) {
        findReplace(argv, combinedArg.re, function (arg) {
          arg = arg.slice(1);
          return arg.split('').map(function (letter) {
            return '-' + letter;
          });
        });
      }

      var invalidMessage = this.definitions.validate(argv);
      if (invalidMessage) {
        throw Error(invalidMessage);
      }

      var output = this.definitions.createOutput();
      var def;

      argv.forEach(function (item) {
        if (option.isOption(item)) {
          def = _this.definitions.get(item);
          if (!t.isDefined(output[def.name])) outputSet(output, def.name, def.getInitialValue());
          if (def.isBoolean()) {
            outputSet(output, def.name, true);
            def = null;
          }
        } else {
          var value = item;
          if (!def) {
            def = _this.definitions.getDefault();
            if (!def) return;
            if (!t.isDefined(output[def.name])) outputSet(output, def.name, def.getInitialValue());
          }

          var outputValue = def.type ? def.type(value) : value;
          outputSet(output, def.name, outputValue);

          if (!def.multiple) def = null;
        }
      });

      o.each(output, function (value, key) {
        if (Array.isArray(value) && value._initial) delete value._initial;
      });

      if (this.definitions.isGrouped()) {
        var grouped = {
          _all: output
        };

        this.definitions.whereGrouped().forEach(function (def) {
          a.arrayify(def.group).forEach(function (groupName) {
            grouped[groupName] = grouped[groupName] || {};
            if (t.isDefined(output[def.name])) {
              grouped[groupName][def.name] = output[def.name];
            }
          });
        });

        this.definitions.whereNotGrouped().forEach(function (def) {
          if (t.isDefined(output[def.name])) {
            if (!grouped._none) grouped._none = {};
            grouped._none[def.name] = output[def.name];
          }
        });
        return grouped;
      } else {
        return output;
      }
    }
  }, {
    key: 'getUsage',
    value: function getUsage(options) {
      return cliUsage(this.definitions, options);
    }
  }]);

  return CommandLineArgs;
})();

function outputSet(output, property, value) {
  if (output[property] && output[property]._initial) {
    output[property] = [];
    delete output[property]._initial;
  }
  if (Array.isArray(output[property])) {
    output[property].push(value);
  } else {
    output[property] = value;
  }
}

function commandLineArgs(definitions) {
  return new CommandLineArgs(definitions);
}