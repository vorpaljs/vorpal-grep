'use strict';

var fs = require('fs');
var path = require('path');
var glob = require('glob');

var chalk = undefined;

var grep = {

  exec: function exec(args, options, cb) {
    var self = this;
    cb = cb || function () {};
    args = args || {
      stdin: []
    };
    var wholeWords = options.wordregexp ? '\\b' : '';
    var regopts = 'g';
    if (options.ignorecase) {
      regopts += 'i';
    }
    var pattern = new RegExp('(' + wholeWords + args.pattern + wholeWords + ')', regopts);

    if (options.maxcount && isNaN(options.maxcount)) {
      self.log('grep: invalid max count');
      cb();
      return;
    }

    fetch(args.files, args.stdin, options, function (err, stdin, logs) {
      /* istanbul ignore next */
      if (err) {
        self.log(chalk.red(err));
        cb(err);
        return;
      }

      if (options.messages === undefined) {
        for (var i = 0; i < logs.length; ++i) {
          self.log(logs[i]);
        }
      }

      var uniques = uniqFiles(stdin);

      for (var i = 0; i < stdin.length; ++i) {
        var maxCounter = 0;
        var bytes = 0;
        if (stdin[i][0] === undefined) {
          continue;
        }
        for (var j = 0; j < stdin[i][0].length; ++j) {
          var line = String(stdin[i][0][j]);
          var match = line.match(pattern);
          var offset = bytes;
          var result = undefined;
          bytes += line.length + 1;
          if (match && options.invertmatch === undefined) {
            result = line.replace(pattern, chalk.red('$1'));
          } else if (match === null && options.invertmatch === true) {
            result = line;
          }
          if (options.byteoffset && result !== undefined) {
            result = '' + chalk.green(offset) + chalk.cyan(':') + result;
          }
          if (options.linenumber && result !== undefined) {
            result = '' + chalk.green(j + 1) + chalk.cyan(':') + result;
          }
          if ((uniques.length > 1 || options.withfilename) && result !== undefined && options.filename === undefined) {
            result = '' + chalk.magenta(stdin[i][1] || 'stdin') + (chalk.cyan(':') + result);
          }
          if (result !== undefined) {
            maxCounter++;
            if (options.maxcount && maxCounter > options.maxcount) {
              continue;
            }
            if (options.silent === undefined && options.quiet === undefined) {
              self.log(result);
            }
          }
        }
      }
      cb();
    });
  }
};

module.exports = function (vorpal) {
  if (vorpal === undefined) {
    return grep;
  }
  vorpal.api = vorpal.api || {};
  vorpal.api.grep = grep;
  chalk = vorpal.chalk;
  vorpal.command('grep <pattern> [files...]', 'Grep (POSIX) implementation.').option('-i, --ignore-case', 'ignore case distinctions').option('-w, --word-regexp', 'force pattern to match only whole words').option('-s, --no-messages', 'suppress error messages').option('-v, --invert-match', 'select non-matching lines').option('-m, --max-count [num]', 'stop after num matches').option('-b, --byte-offset', 'print the byte offset with output lines').option('-n, --line-number', 'print the line number with output lines').option('-H, --with-filename', 'print the file name for each match').option('-h, --no-filename', 'suppress the file name prefix on output').option('-q, --quiet', 'suppress all normal output').option('--silent', 'suppress all normal output').option('--include [file_pattern]', 'search only files that match file_pattern').hidden().action(function (args, cb) {
    grep.exec.call(this, args, args.options, cb);
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

function fetch(files, stdin, options, cb) {
  files = files || [];
  stdin = stdin === undefined ? [] : [stdin];
  var logs = [];
  expand(files, function (err, f) {
    /* istanbul ignore next */
    if (err) {
      cb(err);
      return;
    }

    if (!(f.length === 0 && files.length > 0)) {
      files = f;
    }

    for (var i = 0; i < files.length; ++i) {
      try {
        var stat = fs.statSync(files[i]);
        var parts = path.parse(files[i]);
        if (stat.isDirectory()) {
          logs.push('grep: ' + files[i] + ': Is a directory');
          files[i] = undefined;
        } else if (options.include !== undefined && matches(parts.base, options.include) || options.include === undefined) {
          files[i] = [String(fs.readFileSync(path.normalize(files[i]), 'utf8')).split('\n'), files[i]];
        } else {
          files[i] = undefined;
        }
      } catch (e) {
        logs.push('grep ' + files[i] + ': No such file or directory');
        files[i] = undefined;
      }
    }

    for (var i = 0; i < stdin.length; ++i) {
      stdin[i] = String(stdin[i]).split('\n');
    }

    var agg = files.length < 1 ? [stdin] : files;
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
      /* istanbul ignore next */
    } else if (err && !back) {
        back = true;
        cb(err, []);
      }
  };

  if (list.length < 1) {
    cb(undefined, []);
    return;
  }

  function prehandler(err, res) {
    files = files.concat(res);
    handler(err);
  }

  for (var i = 0; i < total; ++i) {
    glob(list[i], {}, prehandler);
  }
}

function matches(str, rule) {
  return new RegExp('^' + rule.replace('*', '.*') + '$').test(str);
}