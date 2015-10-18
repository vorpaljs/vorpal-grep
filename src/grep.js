'use strict';

/**
 * Module dependencies.
 */

const util = require('util');
const fs = require('fs');
const glob = require('glob');

let chalk;

module.exports = function (vorpal) {
  chalk = vorpal.chalk;

  vorpal
    .command('grep <pattern> [files...]', 'Grep (POSIX) implementation.')
    .option('-i, --ignore-case', 'ignore case distinctions')
    .option('-w, --word-regexp', 'force pattern to match only whole words')
    .option('-s, --no-messages', 'suppress error messages')
    .option('-v, --invert-match', 'select non-matching lines')
    .option('-m, --max-count <num>', 'stop after num matches')
    .option('-b, --byte-offset', 'print the byte offset with output lines')
    .option('-n, --line-number', 'print the line number with output lines')
    .option('-H, --with-filename', 'print the file name for each match')
    .option('-h, --no-filename', 'suppress the file name prefix on output')
    .option('-q, --quiet', 'suppress all normal output')
    .option('--silent', 'suppress all normal output')
    .hidden()
    .action(function (args, cb) {
      const self = this;

      let regopts = 'g';
      let wholeWords = (args.options.wordregexp) ? '\\b' : '';
      if (args.options.ignorecase) {
        regopts += 'i';
      }
      const pattern = new RegExp(`(${wholeWords}${args.pattern}${wholeWords})`, regopts);

      if (args.options.maxcount && isNaN(args.options.maxcount)) {
        self.log('grep: invalid max count');
        cb();
        return;
      }

      fetch(args.files, args.stdin, function(err, stdin, logs) {

        if (err) {
          self.log(chalk.red(err));
          cb(err);
          return;
        }

        if (args.options.messages === undefined) {
          for (let i = 0; i < logs.length; ++i) {
            self.log(logs[i]);
          }
        }

        const uniques = uniqFiles(stdin);

        for (let i = 0; i < stdin.length; ++i) {
          let maxCounter = 0;
          let bytes = 0;
          for (let j = 0; j < stdin[i][0].length; ++j) {
            const line = String(stdin[i][0][j]);
            let match = line.match(pattern);
            let result;
            let offset = bytes;
            bytes += line.length + 1;
            if (match && args.options.invertmatch === undefined) { 
              result = line.replace(pattern, chalk.red('$1'));
            } else if (match === null && args.options.invertmatch === true) {
              result = line;
            }
            if (args.options.byteoffset && result !== undefined) {
              result = `${chalk.green(offset)}${chalk.cyan(`:`)}${result}`;
            }
            if (args.options.linenumber && result !== undefined) {
              result = `${chalk.green(j + 1)}${chalk.cyan(`:`)}${result}`;
            }
            if ((uniques.length > 1 || args.options.withfilename) && result !== undefined && args.options.filename === undefined) {
              result = `${chalk.magenta(stdin[i][1])}${chalk.cyan(`:`)}${result}`;
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
  const mem = {}
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

function fetch(files, stdin, cb) {
  files = files || [];
  stdin = (stdin !== undefined) ? [stdin] : [];
  const logs = [];
  expand(files, function(err, f) {
    if (err) {
      cb(err);
      return;
    }
    
    if (!(f.length === 0 && files.length > 0)) {
      files = f;
    } 

    for (let i = 0; i < files.length; ++i) {
      try {
        files[i] = [String(fs.readFileSync(files[i], 'utf8')).split('\n'), files[i]];
      } catch(e) {
        logs.push(`grep ${files[i]}: No such file or directory`);
        files[i] = undefined;
      }
    }

    for (let i = 0; i < stdin.length; ++i) {
      stdin[i] = String(stdin[i]).split('\n');
    }

    const agg = (files.length < 1) ? stdin : files;
    const final = [];

    for (var i = 0; i < agg.length; ++i) {
      if (agg[i] !== undefined) {
        final.push(agg[i]);
      }
    }

    cb(undefined, final, logs);
  });
}

function expand(list, cb) {
  const total = list.length;
  let done = 0;
  let files = [];
  let back = false;
  let handler = function (err) {
    done++;
    if (done >= total && !back) {
      back = true;
      cb(undefined, files);
    } else if (err && !back) {
      back = true;
      cb(err, []);
    }
  }

  if (list.length < 1) {
    cb(undefined, []);
    return;
  }

  for (let i = 0; i < total; ++i) {
    glob(list[i], {}, function (err, res){
      files = files.concat(res);
      handler(err);
    });
  }
}
