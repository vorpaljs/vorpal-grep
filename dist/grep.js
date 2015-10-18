'use strict';

/**
 * Module dependencies.
 */

var util = require('util');
var fs = require('fs');
var glob = require('glob');

var chalk = undefined;

module.exports = function (vorpal) {
  chalk = vorpal.chalk;

  vorpal.command('grep <pattern> [files...]', 'Grep (POSIX) implementation.').option('-i, --ignore-case', 'ignore case distinctions').option('-w, --word-regexp', 'force pattern to match only whole words').option('-s, --no-messages', 'suppress error messages').option('-v, --invert-match', 'select non-matching lines').option('-m, --max-count <num>', 'stop after num matches').option('-b, --byte-offset', 'print the byte offset with output lines').option('-n, --line-number', 'print the line number with output lines').option('-H, --with-filename', 'print the file name for each match').option('-h, --no-filename', 'suppress the file name prefix on output').option('-q, --quiet', 'suppress all normal output').option('--silent', 'suppress all normal output').hidden().action(function (args, cb) {
    var self = this;

    var regopts = 'g';
    var wholeWords = args.options.wordregexp ? '\\b' : '';
    if (args.options.ignorecase) {
      regopts += 'i';
    }
    var pattern = new RegExp('(' + wholeWords + args.pattern + wholeWords + ')', regopts);

    if (args.options.maxcount && isNaN(args.options.maxcount)) {
      self.log('grep: invalid max count');
      cb();
      return;
    }

    fetch(args.files, args.stdin, function (err, stdin, logs) {

      if (err) {
        self.log(chalk.red(err));
        cb(err);
        return;
      }

      if (args.options.messages === undefined) {
        for (var i = 0; i < logs.length; ++i) {
          self.log(logs[i]);
        }
      }

      var uniques = uniqFiles(stdin);

      for (var i = 0; i < stdin.length; ++i) {
        var maxCounter = 0;
        var bytes = 0;
        for (var j = 0; j < stdin[i][0].length; ++j) {
          var line = String(stdin[i][0][j]);
          var match = line.match(pattern);
          var result = undefined;
          var offset = bytes;
          bytes += line.length + 1;
          if (match && args.options.invertmatch === undefined) {
            result = line.replace(pattern, chalk.red('$1'));
          } else if (match === null && args.options.invertmatch === true) {
            result = line;
          }
          if (args.options.byteoffset && result !== undefined) {
            result = '' + chalk.green(offset) + chalk.cyan(':') + result;
          }
          if (args.options.linenumber && result !== undefined) {
            result = '' + chalk.green(j + 1) + chalk.cyan(':') + result;
          }
          if ((uniques.length > 1 || args.options.withfilename) && result !== undefined && args.options.filename === undefined) {
            result = '' + chalk.magenta(stdin[i][1]) + chalk.cyan(':') + result;
          }
          if (result !== undefined) {
            maxCounter++;
            if (args.options.maxcount && maxCounter > args.options.maxcount) {
              continue;
            }
            if (args.options.silent === undefined && args.options.quiet === undefined) {
              self.log(result);
            }
          }
        }
      }

      cb();
    });
  });
};

function uniqFiles(stdin) {
  var mem = {};
  var result = [];
  var count = 0;
  for (var i = 0; i < stdin.length; ++i) {
    if (mem[stdin[i][1]] === undefined) {
      count++;
      mem[stdin[i][1]] = true;
      result.push(stdin[i][1]);
    }
  }
  return result;
}

function fetch(files, stdin, cb) {
  files = files || [];
  stdin = stdin !== undefined ? [stdin] : [];
  var logs = [];
  expand(files, function (err, f) {
    if (err) {
      cb(err);
      return;
    }

    if (!(f.length === 0 && files.length > 0)) {
      files = f;
    }

    for (var _i = 0; _i < files.length; ++_i) {
      try {
        files[_i] = [String(fs.readFileSync(files[_i], 'utf8')).split('\n'), files[_i]];
      } catch (e) {
        logs.push('grep ' + files[_i] + ': No such file or directory');
        files[_i] = undefined;
      }
    }

    for (var _i2 = 0; _i2 < stdin.length; ++_i2) {
      stdin[_i2] = String(stdin[_i2]).split('\n');
    }

    var agg = files.length < 1 ? stdin : files;
    var final = [];

    for (var i = 0; i < agg.length; ++i) {
      if (agg[i] !== undefined) {
        final.push(agg[i]);
      }
    }

    cb(undefined, final, logs);
  });
}

function expand(list, cb) {
  var total = list.length;
  var done = 0;
  var files = [];
  var back = false;
  var handler = function handler(err) {
    done++;
    if (done >= total && !back) {
      back = true;
      cb(undefined, files);
    } else if (err && !back) {
      back = true;
      cb(err, []);
    }
  };

  if (list.length < 1) {
    cb(undefined, []);
    return;
  }

  for (var i = 0; i < total; ++i) {
    glob(list[i], {}, function (err, res) {
      files = files.concat(res);
      handler(err);
    });
  }
}