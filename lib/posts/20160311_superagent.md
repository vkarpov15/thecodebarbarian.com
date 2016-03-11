The [`$httpBackend` service](https://docs.angularjs.org/api/ngMock/service/$httpBackend) is definitely one of my top 10 AngularJS features. It makes TDD incredibly easy, [especially if you're testing directives as a whole](http://thecodebarbarian.com/2015/06/12/testing-angularjs-directives).
For instance, if you have a directive that makes an HTTP request:

```javascript
angular.module('myApp', []).directive('myDirective', function() {
  return {
    scope: false,
    controller: function($scope, $http) {
      $http.get('/').then(function(res) {
        $scope.data = res;
      });
    }
  };
});
```

You can stub out requests on a per-test basis with the `$httpBackend`
service, as long as you include the `ngMockE2E` module.

```javascript
describe('MyDirective', function() {
  it('makes an http request', function(done) {
    var injector = angular.injector(['myApp', 'ngMockE2E']);
    var rootScope = injector.get('$rootScope');
    var httpBackend = injector.get('$httpBackend');
    var compile = injector.get('$compile');
    var scope = rootScope.$new();

    httpBackend.expectGET('/').respond({ hello: 'world' });
    compile('<my-directive></my-directive>')(scope);
    httpBackend.flush();
    assert.deepEqual(scope.data, { hello: 'world' });
  });
})
```

The `$httpBackend` service is neat, but it has all the same limitations
that AngularJS 1.x does: it's hard to use `$httpBackend` in Node.js or
with React, Riot, Cycle, or any non-AngularJS toolkit. Enter
[superagent](https://www.npmjs.com/package/superagent), an elegant chainable
HTTP request builder that's fully isomorphic (or "universal" if you prefer,
but I think universal sounds too vague).

Introducing `superagent-httpbackend`
------------------------------------

Superagent is a great HTTP client. It's isomorphic, so you can take advantage
of server-side rendering and run tests in Node.js. It's also not tied to
any particular framework, so you can re-use your HTTP client logic on the
server, in your web app, and even in React Native mobile apps. Superagent
is also implemented to be easily pluggable, so it's easy to configure
superagent to fit your needs.

However, when using superagent, I really miss `$httpBackend`. There are
two nice stubbing plugins for superagent,
[superagent-mock](https://github.com/M6Web/superagent-mock) and
[superagent-mocker](https://github.com/A/superagent-mocker). I don't
like the former's syntax, and the latter has decent syntax but does
more monkey-patching internally than I'm comfortable with.
I ended up writing my own: [superagent-httpbackend](http://npmjs.org/package/superagent-httpbackend),
which attempts to emulate `$httpBackend` syntax for superagent.

Much like `$httpBackend`, `superagent-httpbackend` gives you an `httpBackend`
object that lets you stub out your server. The plugin only modifies
superagent's `end()` function, so it should minimize conflict with other
superagent plugins. I've used `superagent-httpbackend` successfully with
`superagent-promise` and a couple internal plugins.

Here's an example of `superagent-httpbackend` in action.

```javascript
const superagent = require('superagent');
const httpBackend = require('superagent-httpbackend');

let response = null;
httpBackend.expect('GET', '/hello').respond({ hello: 'world' });
superagent.get('/hello', (err, res) => {
  response = res;
});
assert.strictEqual(response, null);
httpBackend.flush();
assert.deepEqual(response.body, { hello: 'world' });
```

Like AngularJS' `$httpBackend` service, `superagent-httpbackend` lets you
define a stubbed out backend using `.expect()`. When you want to trigger
all the responses, you call `httpBackend.flush()`. Note that
`httpBackend.flush()` is **synchronous**, like `$httpBackend` and unlike
the `superagent-mocker` equivalent.

Why Superagent?
---------------

The number of JavaScript environments out there is growing rapidly.
Nowadays you need JavaScript that not only works on Node.js and in the
browser, but in Cordova apps, React Native, NativeScript, Electron,
and whatever crazy JavaScript environments come out next week.
Superagent runs on all of these environments with a simple `require()`
statement. It's highly customizable, and the code is sufficiently
simple that you can dig in and modify it if the plugin architecture
doesn't work for you.

Conclusion
----------

Check out [`superagent-httpbackend` on npm](https://www.npmjs.com/package/superagent-httpbackend) for more docs.
The syntax attempts to emulate `$httpBackend`, but the plugin was written
with just enough functionality to help build a test suite I was working on this
week. Feel free to open up any issues or pull requests on [GitHub](https://github.com/vkarpov15/superagent-httpbackend).

*Did you know that `superagent.then()` doesn't return an actual promise?
That's what [superagent-promise](https://www.npmjs.com/package/superagent-promise) is for.
However, `superagent.then()` makes it possible to `yield` a superagent
request from [co](https://www.npmjs.com/package/co). Want to learn why?
Check out my ebook, ["The 80/20 Guide To ES2015 Generators"](https://www.npmjs.com/package/co).*
