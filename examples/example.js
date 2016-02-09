'use strict';

const vorpal = require('vorpal')();
const grep = require('./../dist/grep');
const chalk = require('chalk');

vorpal
  .delimiter(`${chalk.grey(`${chalk.blue(`grep example`)}:`)}`)
  .use(grep)
  .show();

vorpal.exec('grep caasdfasdft ./node_modules/istanbul -r');
