# Vorpal - Grep

[![Build Status](https://travis-ci.org/vorpaljs/vorpal-grep.svg)](https://travis-ci.org/vorpaljs/vorpal-grep)
[![Coverage Status](https://coveralls.io/repos/vorpaljs/vorpal-grep/badge.svg?branch=master)](https://coveralls.io/r/vorpaljs/vorpal-grep?branch=master)
[![XO: Linted](https://img.shields.io/badge/xo-linted-blue.svg)](https://github.com/sindresorhus/xo)

A 100% Javascript (ES2015) implementation of the [grep](https://en.wikipedia.org/wiki/Grep) command.

A [Vorpal.js](https://github.com/dthree/vorpal) extension, `vorpal-grep` lets you grep content in a Vorpal environment!

Letter-perfect POSIX implementation, 28 tests, 100% coverage.

### Installation

```bash
npm install vorpal-grep
npm install vorpal
```

### Getting Started

```js
const vorpal = require('vorpal')();
const hn = require('vorpal-hacker-news');
const grep = require('vorpal-grep');

vorpal
  .delimiter('node~$')
  .use(hn)
  .use(grep)
  .show();
```

```bash
$ node hacker-news.js
node~$ hacker-news | grep "Vorpal"
4. Vorpal: a framework for interactive CLIs in Node.js (github.com)
node~$
```

### Contributing

Feel free to contribute! So far 12 options are supported, help get them all supported!

### License

MIT © [David Caccavella](https://github.com/dthree)

