# Vorpal - Grep

[![Build Status](https://travis-ci.org/vorpaljs/vorpal-grep.svg)](https://travis-ci.org/vorpaljs/vorpal-grep)
[![XO: Linted](https://img.shields.io/badge/xo-linted-blue.svg)](https://github.com/sindresorhus/xo)

A 100% Javascript (ES2015) implementation of the [grep](https://en.wikipedia.org/wiki/Grep) command.

A [Vorpal.js](https://github.com/dthree/vorpal) extension, `vorpal-grep` lets you grep content in a Vorpal environment.

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
node~$ hacker-news | grep
...
... content
...
:
```

### Examples

- [Hackers News](https://github.com/vorpaljs/vorpal-grep/blob/master/examples/hacker-news.js)
- [Rock Paper Scissors](https://github.com/vorpaljs/vorpal-grep/blob/master/examples/rock-paper-scissors.js)

### Implementation

`vorpal-grep` aims to be a letter-perfect implementation of the `grep` command you know (and love?). All features implmented so far will appear in its help menu:

```bash
vorpal~$ grep --help
```
##### Implemented:

- Primary functionality, prompt, screen writing, etc.
- All navigation commands and shortcuts.
- Grep-style help menu.

### Contributing

Feel free to contribute! Additional work is needed on:

- Search options
- File-reading options
- Option flags

### License

MIT © [David Caccavella](https://github.com/dthree)

