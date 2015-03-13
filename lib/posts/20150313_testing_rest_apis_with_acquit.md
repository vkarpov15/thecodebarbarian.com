*This blog originally appeared on [strongloop.com](https://strongloop.com/strongblog/nodejs-testing-documenting-apis-mocha-acquit/). StrongLoop provides tools and services for companies developing APIs in Node. [Learn more...](http://www.strongloop.com)*

When people build REST APIs with Express, testing and documentation are often an afterthought.
The situation with testing your documentation is often even worse.
When's the last time you built an automated testing system for your documentation's examples?
When I sat down to write [acquit](https://www.npmjs.com/package/acquit), I wanted a simple tool to generate documentation from mocha tests for [mongoose](https://www.npmjs.com/package/mongoose).
But, the paradigm of generating documentation from tests is even more useful for API-level integration tests.
In this article, I'll explain

* What API-level integration tests are
* How to use acquit to parse integration tests into documentation

API-Level Integration Tests
===========================

You may have seen the testing pyramid before:

<img src="http://i.imgur.com/uLQvkdS.png" style="width: 400px" />

The components of the testing pyramid are as described below.

* Unit tests test individual units of code in isolation (for instance, individual functions). They are fast and you usually have a lot of them.
* Integration tests test the integrations between different units.
* E2E tests test the system as a whole.

The concept "integration test" is flexible depending on your
application and choice of testing paradigm.
In this article, you will be primarily concerned with 
integration tests that test your REST API as a whole.
If your entire product is a REST API then you may consider
this an E2E test. But, for the purposes of this article,
these tests will be called "API-level integration tests."

How are you going to write API-level integration tests for
Express? NodeJS' concurrency model makes
writing API-level integration tests simple. The key idea
is that your mocha tests can start and stop an Express
server. Once your mocha tests start a server, the same process
can use an HTTP client (for example, [request](https://www.npmjs.com/package/request) or [superagent](https://www.npmjs.com/package/superagent)) to send requests to your Express
server. No need for any messy multithreading.

For this article, you'll be using the
[acquit-example](https://github.com/vkarpov15/acquit-example/tree/84d6ebd3e83c7edaadd8a16d96aa07f7f136d95f)
repo as an example. This repo defines a trivial REST API
in the `server.js` file. There's one route: `GET /user/:user`
returns a user object if the username is in the list, and
an HTTP 404 otherwise.

```javascript
var express = require('express');
var status = require('http-status');
var users = require('./users');

var createServer = function(port) {
  var app = express();

  app.get('/user/:user', function(req, res) {
    if (users.list.indexOf(req.params.user) === -1) {
      return res.status(status.NOT_FOUND).
        json({ error: 'Not Found' });
    }
    res.json({ user: req.params.user });
  });

  return app.listen(port);
};

module.exports = createServer;
```

**`http-status` defines a map from readable HTTP status names
to numeric codes. For instance, `NOT_FOUND === 404`. This
module, while simple, is a module that I'd never write a web
server without.**

The `users.js` file included in the above code example is a
stub for a real database. In a real application you'd probably
want to install [MongoDB](http://www.mongodb.org/downloads)
and [Mongoose](https://www.npmjs.com/package/mongoose), but
the extra setup would just add extra overhead to this example.
The `users.js` file is shown below.

```javascript
exports.list = [
  'user1',
  'user2'
];
```

Nothing too fancy, but, as you'll see, enough to enable tests
to manipulate the list of users. Another key advantage of
API-level integration tests in NodeJS is that you can re-use
the same database interface you already use in your code.
In other words, you can use Mongoose or whatever your database
interface of choice is to insert data for each test within
mocha's elegant flow control.
In this case, tests can `require()` the same `users.js` file
and manipulate the underlying list of users as shown in the
`test/api-integration.test.js` file below.

```javascript
var assert = require('assert');
var superagent = require('superagent');
var server = require('../server');
var users = require('../users');
var status = require('http-status');

describe('/user', function() {
  var app;

  before(function() {
    app = server(3000);
  });

  after(function() {
    app.close();
  });

  it('returns username if name param is a valid user', function(done) {
    users.list = ['test'];
    superagent.get('http://localhost:3000/user/test').end(function(err, res) {
      assert.ifError(err);
      assert.equal(res.status, status.OK);
      var result = JSON.parse(res.text);
      assert.deepEqual({ user: 'test' }, result);
      done();
    });
  });

  it('returns 404 if user named `params.name` not found', function(done) {
    users.list = ['test'];
    superagent.get('http://localhost:3000/user/notfound').end(function(err, res) {
      assert.ifError(err);
      assert.equal(res.status, status.NOT_FOUND);
      var result = JSON.parse(res.text);
      assert.deepEqual({ error: 'Not Found' }, result);
      done();
    });
  });
});
```

The above code demonstrates the two key ideas of API-level
integration tests. First, since you're using NodeJS, you
can create an Express server and then use superagent to send
HTTP requests to it. Second, since the server and tests share
the same process, you can manipulate the server in whatever
way your tests require. You can manipulate the underlying
data, shut down the server mid-request, even
[simulate malicious requests](https://github.com/vkarpov15/mongo-sanitize/blob/7fead5c917a5d9ea00661c7ed54375ed839d0bae/test.js#L38-84).

Hopefully this example shows you why I think NodeJS is so
easy to test. API-level integration tests aren't a replacement
for proper unit testing. Unit tests are like broccoli - you
may not like writing them, but you should write them anyway
if you want your codebase to grow up big and strong. However,
API-level integration tests are useful for catching bugs in
integrations between modules, great for REST API TDD, and
useful for generating documentation. As a matter of fact,
documentation is the subject of the next section.

Generating Documentation from Tests
===================================

API-level integration tests are a cool concept that might
not be obvious to people from Java or C++ backgrounds
(myself included), but there's nothing new there. The
application of API-level integration tests to documentation,
though, is much more novel.

In this section, you'll learn about the
[acquit](https://www.npmjs.com/package/acquit) module, a
lightweight tool I wrote to generate documentation from
mocha tests. Acquit started out as a tool to generate docs
for Mongoose's browser component: I wanted documentation with
examples that I knew would work as advertised in IE9. Dusting
off my Windows laptop and hitting F12 repeatedly was not
a viable approach. Since
then, I've used to generate documentation for numerous npm modules, including
[mongoose-autopopulate](https://www.npmjs.com/package/mongoose-autopopulate),
[kareem](https://www.npmjs.com/package/kareem),
and even acquit itself. When connected to API-level 
integration tests, you have a mechanism to generate
well-tested documentation for your REST API.

All the work necessary to integrate acquit for docs generation
is in [this GitHub commit](https://github.com/vkarpov15/acquit-example/commit/a476384ce5d030361e9cfb0f6a75bc4754dfdab5).
The key work is in the `docs.js` file:

```
var acquit = require('acquit');

var content = require('fs').
  readFileSync('test/api-integration.test.js').toString();
// Parse the contents of the test file into acquit 'blocks'
var blocks = acquit.parse(content);
var header = require('fs').readFileSync('./header.md').toString();

var mdOutput = header + '\n\n';

// For each describe() block
for (var i = 0; i < blocks.length; ++i) {
  var describe = blocks[i];
  mdOutput += '## ' + describe.contents + '\n\n';
  mdOutput += describe.comments[0] ?
    acquit.trimEachLine(describe.comments[0]) + '\n\n' :
    '';

  // This test file only has it() blocks underneath a
  // describe() block, so just loop through all the
  // it() calls.
  for (var j = 0; j < describe.blocks.length; ++j) {
    var it = describe.blocks[j];
    mdOutput += '#### It ' + it.contents + '\n\n';
    mdOutput += it.comments[0] ?
      acquit.trimEachLine(it.comments[0]) + '\n\n' :
      '';
    mdOutput += '```javascript\n';
    mdOutput += '    ' + it.code + '\n';
    mdOutput += '```\n\n';
  }
}

require('fs').writeFileSync('README.md', mdOutput);
```

Similar to [dox](https://www.npmjs.com/package/dox), acquit
doesn't limit you to a particular output format. All acquit
provides you is the `parse()` function, which parses your
tests into a handy format for documentation generation, and
the `trimEachLine()` helper. The `trimEachLine()` helper is
useful for trimming asterisks from multiline comments.

The `parse()` function uses
the [esprima JS parser](https://www.npmjs.com/package/esprima)
to parse the mocha tests you saw in the last section
into "blocks" that look like what's shown below.

```javascript
[
  {
    "type": "describe",
    "contents": "/user",
    "blocks": [
      {
        "type": "it",
        "contents": "returns username if name param is a valid user",
        "comments": [
          "*\n   *  In addition to parsing the test contents and code..."
        ],
        "code": "\n    users.list = ['test'];\n..."
      },
      {
        "type": "it",
        "contents": "returns 404 if user named `params.name` not found",
        "comments": [
          "*\n   *  Acquit also has a handy `acquit.trimEachLine()` function..."
        ],
        "code": "\n    users.list = ['test'];\n..."
      }
    ],
    "comments": []
  }
]
```

You can then use this output to generate markdown (as shown
in this example), jade, plain HTML, or whatever your preferred
output format is. Running `docs.js` file with `node docs.js`
will generate [a `README.md` file from your tests](https://github.com/vkarpov15/acquit-example/blob/master/README.md) that provides some high-level documentation for the example REST API.

Conclusion
==========

Hopefully this article got you excited about generating
documentation. With acquit, generating documentation is as
easy as writing good tests. With API-level integration
tests and acquit, you have no more excuses to avoid
documenting your REST API.
