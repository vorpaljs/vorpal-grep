'use strict';

require('assert');

var should = require('should');
var grep = require('./../dist/grep');
var vorpal = require('vorpal')();
var strip = require('strip-ansi');

var _stdout = '';

function stdout() {
  var out = _stdout;
  _stdout = '';
  return out;
};

vorpal.pipe(function (str) {
  _stdout += str;
  return '';
});

describe('vorpal-grep', function () {

  before(function() {
    vorpal.command('foo').action(function (args, cb) {
      this.log('bar1!\nbar2!\nbar3!');
      cb();
    });

    vorpal.command('reverse').action(function (args, cb) {
      this.log(String(args.stdin[0]).split('').reverse().join(''));
      cb();
    });
  });

  it('should exist and be a function', function () {
    should.exist(grep);
    grep.should.be.type('function');
  });

  it('should import into Vorpal', function () {
    (function () {
      vorpal.use(grep);
    }).should.not.throw();
  });

  it('should exist as a command in Vorpal', function () {
    var exists = false;
    for (var i = 0; i < vorpal.commands.length; ++i) {
      if (vorpal.commands[i]._name === 'grep') {
        exists = true;
      }
    }
    exists.should.be.true;
  });

  it('should find matches in a single file', function (done) {
    vorpal.exec('grep cats ./test/fixtures/a.txt', function (err, data) {
      var out = ( 
        'a:6| and then the farmer said he liked cats and things are rather repetitive today and such and the like like other things like that okay and yes i get it.' + 
        'a:7| cats' + 
        'a:10| cats and socats and more cats'
      );
      strip(stdout()).should.equal(out);
      done();
    });
  });

  it('should color matches with red', function (done) {
    vorpal.exec('grep cats ./test/fixtures/a.txt', function (err, data) {
      stdout().should.containEql('\u001b[31mcats\u001b[39m');
      done();
    });
  });

  it('should shit on directories', function (done) {
    vorpal.exec('grep cats ./test/fixtures', function (err, data) {
      stdout().should.containEql('Is a directory');
      done();
    });
  });

  it('should shit on invalid files', function (done) {
    vorpal.exec('grep cats ./fixturesandsoon**', function (err, data) {
      strip(stdout()).should.containEql('grep ./fixturesandsoon**: No such file or directory');
      done();
    });
  });

  it('should handle wildcards', function (done) {
    vorpal.exec('grep cats ./test/fixtures/*.*', function (err, data) {
      var fix1 = './test/fixtures/a.txt:a:10| cats and socats and more cats';
      var fix2 = './test/fixtures/b.txt:b:5| can you cats please';
      var fix3 = './test/fixtures/b.txt:b:13| yeah i said cats';
      var fix4 = './test/fixtures/c.txt:c:17| what did you cat cat cat and cats';
      var out = strip(stdout());
      out.should.containEql(fix1);
      out.should.containEql(fix2);
      out.should.containEql(fix3);
      out.should.containEql(fix4);
      done();
    });
  });

  it('should color multiple files magenta and cyan', function (done) {
    vorpal.exec('grep cats ./test/fixtures/*.*', function (err, data) {
      var fix = '\u001b[35m./test/fixtures/a.txt\u001b[39m\u001b[36m:\u001b[39m';
      stdout().should.containEql(fix);
      done();
    });
  });

  it('should be case-insensitive by default', function (done) {
    vorpal.exec('grep cats ./test/fixtures/*.*', function (err, data) {
      stdout().should.not.containEql('CATS');
      done();
    });
  });
  
  it('should be case-sensitive with the -i flag.', function (done) {
    vorpal.exec('grep cats ./test/fixtures/*.* -i', function (err, data) {
      stdout().should.containEql('CATS');
      done();
    });
  });

  it('should match partial words by default', function (done) {
    vorpal.exec('grep words ./test/fixtures/a.txt', function (err, data) {
      var fix1 = 'a:13| words and wholewords';
      var fix2 = 'a:14| and wholewords plus';
      var fix3 = 'a:15| and notwholewords and soon';
      var out = strip(stdout());
      out.should.containEql(fix1);
      out.should.containEql(fix2);
      out.should.containEql(fix3);
      done();
    });
  });

  it('should match only whole words with the -w flag', function (done) {
    vorpal.exec('grep words ./test/fixtures/a.txt -w', function (err, data) {
      var fix1 = 'a:13| words and wholewords';
      var fix2 = 'a:14| and wholewords plus';
      var fix3 = 'a:15| and notwholewords and soon';
      var out = strip(stdout());
      out.should.containEql(fix1);
      out.should.not.containEql(fix2);
      out.should.not.containEql(fix3);
      done();
    });
  });

  it('should suppress messages with the -s flag', function (done) {
    vorpal.exec('grep cats ./fixturesandsoon** -s', function (err, data) {
      strip(stdout()).should.not.containEql('grep ./fixturesandsoon**: No such file or directory');
      done();
    });
  });

  it('should match inverted lines with the -v flag', function (done) {
    vorpal.exec('grep words ./test/fixtures/a.txt -v', function (err, data) {
      var fix1 = 'a:13| words and wholewords';
      var fix2 = 'a:14| and wholewords plus';
      var fix3 = 'a:15| and notwholewords and soon';
      var fix4 = 'a:1|';
      var fix5 = 'a:3|';
      var fix6 = 'a:4|';
      var fix7 = 'a:5|';
      var out = strip(stdout());
      out.should.not.containEql(fix1);
      out.should.not.containEql(fix2);
      out.should.not.containEql(fix3);
      out.should.containEql(fix4);
      out.should.containEql(fix5);
      out.should.containEql(fix6);
      out.should.containEql(fix7);
      done();
    });
  });

  it('should shit on an invalid max count', function (done) {
    vorpal.exec('grep cats ./test/fixtures/*.txt -m andso', function (err, data) {
      stdout().should.equal('grep: invalid max count');
      done();
    });
  });

  it('should output a max results per file with the -m flag', function (done) {
    vorpal.exec('grep carrot ./test/fixtures/*.txt -m 1', function (err, data) { 
      var out = strip(stdout());
      out.should.containEql('a:2| carrot');
      out.should.containEql('b:21| carrot');
      out.should.containEql('c:18| carrot');
      out.should.not.containEql('a:3| carrot');
      out.should.not.containEql('a:5| carrot');
      out.should.not.containEql('a:8| carrot');
      out.should.not.containEql('b:22| carrot and some');
      out.should.not.containEql('b:23| carrot');
      out.should.not.containEql('c:29| carrot');
      done();
    });
  });

  it('should show the byte offset with the -b flag', function (done) {
    vorpal.exec('grep cats ./test/fixtures/*.* -bi', function (err, data) {
      var fix = './test/fixtures/c.txt:91:c:17| what did you cat cat cat and cats';
      var out = strip(stdout());
      out.should.containEql(fix);
      done();
    });
  });

  it('should color the byte offset green', function (done) {
    vorpal.exec('grep cats ./test/fixtures/*.* -bi', function (err, data) {
      var fix = '\u001b[32m91\u001b[39m\u001b[36m:\u001b[39m';
      var out = stdout();
      out.should.containEql(fix);
      done();
    });
  });

  it('should show the line number with the -n flag', function (done) {
    vorpal.exec('grep cats ./test/fixtures/*.* -nb', function (err, data) {
      var fix = './test/fixtures/c.txt:17:91:c:17| what did you cat cat cat and cats';
      var out = strip(stdout());
      out.should.containEql(fix);
      done();
    });
  });

  it('should color the line number green', function (done) {
    vorpal.exec('grep cats ./test/fixtures/*.* -nb', function (err, data) {
      var fix = '\u001b[32m17\u001b[39m\u001b[36m:\u001b[39m';
      var out = stdout();
      out.should.containEql(fix);
      done();
    });
  });

  it('should not show the filename for single file matches', function (done) {
    vorpal.exec('grep asinglematchbecause ./test/fixtures/a.txt', function (err, data) {
      var out = strip(stdout());
      out.should.not.containEql('./test/fixtures/a.txt');
      out.should.containEql('a:22| asinglematchbecause');
      done();
    });
  });

  it('should show the filename for single file matches with the -H flag', function (done) {
    vorpal.exec('grep asinglematchbecause ./test/fixtures/a.txt -H', function (err, data) {
      var out = strip(stdout());
      out.should.containEql('./test/fixtures/a.txt:');
      out.should.containEql('a:22| asinglematchbecause');
      done();
    });
  });

  it('should suppress the file name with the -h flag', function (done) {
    vorpal.exec('grep cats ./test/fixtures/*.* -h', function (err, data) {
      var out = strip(stdout());
      out.should.not.containEql('./test/fixtures/a.txt');
      out.should.not.containEql('./test/fixtures/b.txt');
      out.should.not.containEql('./test/fixtures/c.txt');
      done();
    });
  });

  it('should suppress stdout with -q', function (done) {
    vorpal.exec('grep cats ./test/fixtures/a.txt -q', function (err, data) {
      stdout().should.not.containEql('cats');
      done();
    });
  });

  it('should not suppress errors with -q', function (done) {
    vorpal.exec('grep cats ./test/fixtures/a.txt --silent -m andso', function (err, data) {
      stdout().should.equal('grep: invalid max count');
      done();
    });
  });

  it('should only match patterns with the --include flag', function (done) {
    vorpal.exec('grep 14 ./test/fixtures/*.* --include \'*.md\' ', function (err, data) {
      var out = strip(stdout());
      out.should.containEql('d:14');
      out.should.not.containEql('a:14');
      out.should.not.containEql('b:14');
      out.should.not.containEql('c:14');
      done();
    });
  });

  describe('piping', function () {
    it('should work with piped output.', function (done) {
      vorpal.exec('foo | grep bar2!', function (err, data) {
        var out = strip(stdout());
        out.should.equal('bar2!');
        done();
      });
    });
  })


});
