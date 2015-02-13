*This blog originally appeared on [strongloop.com](http://strongloop.com/strongblog/npm-modules-travis-coveralls/). StrongLoop provides tools and services for companies developing APIs in Node. [Learn more...](http://www.strongloop.com)*

Part of what makes NodeJS so great is the wide variety of high-quality modules available on npm. But, way too many modules don't take advantage of testing tools like [Travis](https://travis-ci.org) and [Coveralls](https://coveralls.io/). Travis is a lightweight continuous integration tool that runs tests on every commit to your GitHub repo, even pull requests. Coveralls is a test coverage reporter that you can integrate with Travis. These tools improve your workflow, make reviewing pull requests easier, and make users more confident in your module's quality. In this article, you'll learn how to integrate these tools with [mocha](https://www.npmjs.com/package/mocha) and [istanbul](https://www.npmjs.com/package/istanbul) for a simple NodeJS project.

This example will use a [JavaScript implementation](https://github.com/vkarpov15/fizzbuzz-coverage) of the well-known ["fizzbuzz" programming challenge](http://en.wikipedia.org/wiki/Fizz_buzz). Fizzbuzz is far from a [complex module](https://github.com/EnterpriseQualityCoding/FizzBuzzEnterpriseEdition), but it's just complex enough to get real test coverage results. To walk through this example, [fork it on GitHub](https://github.com/vkarpov15/fizzbuzz-coverage). The actual code is below.

```javascript
module.exports = function(n) {
  if (typeof n !== 'number') {
    return null;
  }

  if (n % 3 === 0 && n % 5 === 0) {
    return 'fizzbuzz';
  }
  if (n % 3 === 0) {
    return 'fizz';
  }
  if (n % 5 === 0) {
    return 'buzz';
  }

  return '' + n;
};
```

The module's code is not particularly interesting. Testing it is a more subtle task. Most modern testing practices are based on the notion of [cyclomatic complexity](http://en.wikipedia.org/wiki/Cyclomatic_complexity). In other words, 100% test coverage means that your tests execute every possible code path. The fizzbuzz example above has 10 possible code paths (or "branches" in Coveralls parlance). Each `if` statement contributes 2 code paths, except the one with `&&`, which contributes 4. For instance, if you were to replace

```
if (n % 3 === 0 && n % 5 === 0)
```

with

```
if (n % 15 === 0)
```

there would be only 8 branches.

Setting Up Mocha Tests and Producing Coverage Output
====================================================

The first step is to get test coverage output locally. There are several good test frameworks and coverage tools available on npm. But, my tools of choice are the [mocha](https://www.npmjs.com/package/mocha) test framework and [istanbul](https://www.npmjs.com/package/istanbul). You should be able to use any test framework you like in place of mocha in this tutorial, but I find mocha to be a sensible default. First, add mocha and istanbul to your `devDependencies` in `package.json`.

```
  "devDependencies": {
    "istanbul": "0.3.5",
    "mocha": "2.0.0"
  },
```

You should also add a `test` script to your `package.json`, so you can run your tests with the `npm test` command.

```
  "scripts": {
    "test": "./node_modules/mocha/bin/mocha ./test/*"
  }
```

Now, here are some mocha tests for the fizzbuzz module. Mocha uses a BDD-style syntax, which means `describe()` and `it()` correspond roughly to "suites" and "tests" in more conventional testing frameworks like JUnit.

```
var assert = require('assert');
var fizzbuzz = require('../');

describe('fizzbuzz', function() {
  it('returns null when passed a non-number', function() {
    assert.equal(fizzbuzz('abc'), null);
  });

  it('returns fizzbuzz when divisible by 15', function() {
    assert.equal(fizzbuzz(45), 'fizzbuzz');
  });

  it('returns fizz when divisible by 3 but not 5', function() {
    assert.equal(fizzbuzz(6), 'fizz');
  });

  it('returns buzz when divisble by 5 but not 3', function() {
    assert.equal(fizzbuzz(10), 'buzz');
  });

  it('returns input otherwise', function() {
    assert.equal(fizzbuzz(7), '7');
  });
});
```

Run these tests with `npm test`, and you should see a simple test report.

```
specter:fizzbuzz-coverage vkarpov$ npm test

> fizzbuzz-coverage@0.0.0 test /Users/vkarpov/Personal/fizzbuzz-coverage
> ./node_modules/mocha/bin/mocha ./test/*



  fizzbuzz
    ✓ returns null when passed a non-number 
    ✓ returns fizzbuzz when divisible by 15 
    ✓ returns fizz when divisible by 3 but not 5 
    ✓ returns buzz when divisble by 5 but not 3 
    ✓ returns input otherwise 


  5 passing (7ms)
```

Now the question is, how do you get coverage output? That's where istanbul comes in. Istanbul provides a simple executable that wraps your test command and produces [lcov output](http://ltp.sourceforge.net/coverage/lcov.php) by default. Add a `test-travis` script to your `package.json` scripts as shown below.

```
  "scripts": {
    "test": "./node_modules/mocha/bin/mocha ./test/*",
    "test-travis": "./node_modules/istanbul/lib/cli.js cover ./node_modules/mocha/bin/_mocha -- -R spec ./test/*"
  }
```

The script may seem intimidating, but its simple once you look at it carefully. The `./node_modules/istanbul/lib/cli.js` executable is istanbul's CLI wrapper. You can also `require()` istanbul in your NodeJS scripts, but the executable is sufficient for this example. The istanbul CLI takes a `cover` option that tells it to produce coverage output.

The rest of the `test-travis` script configures mocha. First, note that the above script uses the `_mocha` executable, whereas the `test` script used `./node_modules/mocha/bin/mocha`. This is a [common source of confusion when beginners try to set up istanbul and mocha](https://github.com/gotwarlost/istanbul/issues/44). The `mocha` executable forks off a separate executable, `_mocha`, to actually runs tests. If you were to run the `mocha` executable through istanbul, you would get no coverage output.

The `--` means the [end of options passed to the istanbul executable](http://unix.stackexchange.com/questions/11376/what-does-double-dash-mean-also-known-as-bare-double-dash). Everything after `--` will actually be interpretted as an option to the `_mocha` executable.

Now that you have the `test-travis` script, run it to see test coverage output.

```
specter:fizzbuzz-coverage vkarpov$ npm run-script test-travis

> fizzbuzz-coverage@0.0.0 test-travis /Users/vkarpov/Personal/fizzbuzz-coverage
> ./node_modules/istanbul/lib/cli.js cover ./node_modules/mocha/bin/_mocha -- -R spec ./test/*



  fizzbuzz
    ✓ returns null when passed a non-number 
    ✓ returns fizzbuzz when divisible by 15 
    ✓ returns fizz when divisible by 3 but not 5 
    ✓ returns buzz when divisble by 5 but not 3 
    ✓ returns input otherwise 


  5 passing (6ms)

=============================================================================
Writing coverage object [/Users/vkarpov/Personal/fizzbuzz-coverage/coverage/coverage.json]
Writing coverage reports at [/Users/vkarpov/Personal/fizzbuzz-coverage/coverage]
=============================================================================

=============================== Coverage summary ===============================
Statements   : 100% ( 10/10 )
Branches     : 100% ( 10/10 )
Functions    : 100% ( 1/1 )
Lines        : 100% ( 10/10 )
================================================================================
```

Congratulations, you have 100% test coverage! Next up, you're going to set up Travis to run this command automatically on every commit and pull request.

Running Tests and Generating Coverage Output with Travis
========================================================

Travis is a tool that enables you to run a script on every GitHub commit. You can instrument Travis to run the `test-travis` script you saw above. Also, you can configure Travis to post the coverage output to Coveralls. 

First, if you don't have a Travis account yet, [sign up for one](https://travis-ci.org). Next, add a new repository to Travis using the "Add New Repository" button.

<img src="http://i.imgur.com/VDiWlu3.png">

Find the `fizzbuzz-coverage` repo and add it. Next, sign up for an [account on Coveralls](https://coveralls.io). Click on the "Add Repos" button and add `fizzbuzz-coverage`.

<img src="http://i.imgur.com/8EXrUvj.png">

In order to use Travis, your GitHub repo should have a `.travis.yml` file. This file tells Travis how to run tests. For instance, below is the `.travis.yml` file for the `fizzbuzz-coverage` repo (minus one line that you'll learn about later).

```
language: node_js
node_js:
  - "0.11"
  - "0.10"
script: "npm run-script test-travis"
```

This file should seem simple even if you've never worked with Travis before. This configuration tells Travis to run `npm run-script test-travis` on NodeJS 0.10 and 0.11. When you specify `language: node_js`, Travis handles installing NodeJS, cloning your repo, and running `npm install` for you.

Now, how do you send istanbul's coverage output to Coveralls? Like just about everything these days, [there's an npm module for that](https://www.npmjs.com/package/coveralls). The coveralls npm module contains an executable file `coveralls.js` that you can use to send coverage output to Coveralls. You just need to add coveralls to your `package.json`:

```javascript
  "devDependencies": {
    "coveralls": "2.10.0",
    "istanbul": "0.3.5",
    "mocha": "2.0.0"
  },
```

and one line to your `.travis.yml` file.

```
language: node_js
node_js:
  - "0.11"
  - "0.10"
script: "npm run-script test-travis"
# Send coverage data to Coveralls
after_script: "cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js"
```

That's it! You should now have [automatic code coverage for every future commit in an elegant GUI](https://coveralls.io/builds/1849085).

Adding Badges
=============

Now that you've wired your repo to run tests on Travis and send coverage data to Coveralls, you're probably wondering how to get those sweet badges on your GitHub repo.

<img src="http://i.imgur.com/cUsEmPC.png">

Travis and Coveralls expose API endpoints that let you get these SVG (or PNG) representations of your repo's status. To get the SVGs for `fizzbuzz-coverage`, you should wrap the following images in an `<img>` tag.

```
https://api.travis-ci.org/vkarpov15/fizzbuzz-coverage.svg?branch=master
https://coveralls.io/repos/vkarpov15/fizzbuzz-coverage/badge.svg?branch=master
```

You can get the build status and coverage info for any branch by changing the `branch` query param. Below is the markdown code that generates the badges for the GitHub README.

```
[![Build Status](https://travis-ci.org/vkarpov15/fizzbuzz-coverage.svg?branch=master)](https://travis-ci.org/vkarpov15/fizzbuzz-coverage)
[![Coverage Status](https://coveralls.io/repos/vkarpov15/fizzbuzz-coverage/badge.svg)](https://coveralls.io/r/vkarpov15/fizzbuzz-coverage)
```

Conclusion
==========

In this article, you saw how easy it can be to tie your npm modules into Travis and Coveralls. Continuous integration and code coverage used to only be feasible for the Googles of the world, but now even small npm modules can take advantage of these sophisticated dev practices. I look forward to seeing more npm authors take advantage of these excellent tools and get serious about test coverage.
