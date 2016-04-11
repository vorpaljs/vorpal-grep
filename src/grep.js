'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const fsAutocomplete = require('vorpal-autocomplete-fs');

let chalk;

const grep = {

  exec(args, options, cb) {
    const self = this;
    cb = cb || function () {};
    args = args || {
      stdin: []
    };
    const wholeWords = options['word-regexp'] ? '\\b' : '';
    let regopts = 'g';
    if (options['ignore-case']) {
      regopts += 'i';
    }
    const pattern = new RegExp(`(${wholeWords}${args.pattern}${wholeWords})`, regopts);

    if (options['max-count'] && isNaN(options['max-count'])) {
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
        for (let i = 0; i < logs.length; ++i) {
          self.log(logs[i]);
        }
      }

      const uniques = uniqFiles(stdin);

      for (let i = 0; i < stdin.length; ++i) {
        let maxCounter = 0;
        let bytes = 0;
        if (stdin[i][0] === undefined) {
          continue;
        }
        for (let j = 0; j < stdin[i][0].length; ++j) {
          const line = String(stdin[i][0][j]);
          const match = line.match(pattern);
          const offset = bytes;
          let result;
          bytes += line.length + 1;
          if (match && options['invert-match'] === undefined) {
            result = line.replace(pattern, chalk.red('$1'));
          } else if (match === null && options['invert-match'] === true) {
            result = line;
          }
          if (options['byte-offset'] && result !== undefined) {
            result = `${chalk.green(offset)}${chalk.cyan(':')}${result}`;
          }
          if (options['line-number'] && result !== undefined) {
            result = `${chalk.green(j + 1)}${chalk.cyan(':')}${result}`;
          }
          if ((uniques.length > 1 || options['with-filename']) && result !== undefined && options.filename === undefined) {
            result = `${chalk.magenta(stdin[i][1] || 'stdin')}${chalk.cyan(':') + result}`;
          }
          if (result !== undefined) {
            maxCounter++;
            if (options['max-count'] && maxCounter > options['max-count']) {
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
  vorpal
    .command('grep <pattern> [files...]', 'Grep (POSIX) implementation.')
    .option('-i, --ignore-case', 'ignore case distinctions')
    .option('-w, --word-regexp', 'force pattern to match only whole words')
    .option('-s, --no-messages', 'suppress error messages')
    .option('-v, --invert-match', 'select non-matching lines')
    .option('-m, --max-count [num]', 'stop after num matches')
    .option('-b, --byte-offset', 'print the byte offset with output lines')
    .option('-n, --line-number', 'print the line number with output lines')
    .option('-H, --with-filename', 'print the file name for each match')
    .option('-h, --no-filename', 'suppress the file name prefix on output')
    .option('-q, --quiet', 'suppress all normal output')
    .option('-r, --recursive', 'recurse through subdirectories')
    .option('--silent', 'suppress all normal output')
    .option('--include [file_pattern]', 'search only files that match file_pattern')
    .autocomplete(fsAutocomplete())
    .action(function (args, cb) {
      grep.exec.call(this, args, args.options, cb);
    });
};

function uniqFiles(stdin) {
  const mem = {};
  const result = [];
  let count = 0;
  for (let i = 0; i < stdin.length; ++i) {
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
  stdin = (stdin === undefined) ? [] : [stdin];
  const logs = [];
  expand(files, options, function (err, f) {
    /* istanbul ignore next */
    if (err) {
      cb(err);
      return;
    }

    if (!(f.length === 0 && files.length > 0)) {
      files = f;
    }

    for (let i = 0; i < files.length; ++i) {
      try {
        const stat = fs.statSync(files[i]);
        const parts = path.parse(files[i]);
        if (stat.isDirectory()) {
          logs.push(`grep: ${files[i]}: Is a directory`);
          files[i] = undefined;
        } else if (options.include !== undefined && matches(parts.base, options.include) || options.include === undefined) {
          files[i] = [String(fs.readFileSync(path.normalize(files[i]), 'utf8')).split('\n'), files[i]];
        } else {
          files[i] = undefined;
        }
      } catch (e) {
        logs.push(`grep ${files[i]}: No such file or directory`);
        files[i] = undefined;
      }
    }

    for (let i = 0; i < stdin.length; ++i) {
      stdin[i] = String(stdin[i]).split('\n');
    }

    const agg = files.length < 1 ? [stdin] : files;
    const final = [];

    for (let i = 0; i < agg.length; ++i) {
      if (agg[i] !== undefined) {
        final.push(agg[i]);
      }
    }

    cb(undefined, final, logs);
  });
}

function expand(list, options, cb) {
  const total = list.length;
  let done = 0;
  let files = [];
  let back = false;
  const handler = function handler(err) {
    done++;
    if (done >= total && !back) {
      back = true;

      let fnl = [];
      for (let i = 0; i < files.length; ++i) {
        const stat = fs.statSync(files[i]);

        if (stat.isDirectory()) {
          if (options.recursive === true) {
            const res = walkDirRecursive([], files[i]);
            if (Array.isArray(res)) {
              fnl = fnl.concat(res);
            }
          }
        } else {
          fnl.push(files[i]);
        }
      }
      cb(undefined, fnl);
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

  for (let i = 0; i < total; ++i) {
    glob(list[i], {}, prehandler);
  }
}

function matches(str, rule) {
  return new RegExp(`^${rule.replace('*', '.*')}$`).test(str);
}

/**
 * Recursively walks through and executes
 * a callback function for each directory found.
 *
 * @param {String} currentDirPath
 * @param {Function} callback
 * @api private
 */

function walkDirRecursive(arr, currentDirPath) {
  fs.readdirSync(currentDirPath).forEach(function (name) {
    const filePath = path.join(currentDirPath, name);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      arr = walkDirRecursive(arr, filePath);
    } else {
      arr.push(filePath);
    }
  });
  return arr;
}
