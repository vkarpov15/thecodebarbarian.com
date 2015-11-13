*This post originally appeared on [strongloop.com](https://strongloop.com/strongblog/part-4-ionic-loopback-frameworks-testing-with-travis/). StrongLoop provides tools and services for companies developing APIs in Node. [Learn more...](http://www.strongloop.com)*

In the first three articles in this series, you built a simple mobile app and
server using the Ionic Framework and StrongLoop LoopBack. In this article,
you'll learn about one key advantage of building mobile apps with Ionic:
access to the JavaScript testing ecosystem. Testing native apps is hard.
[TravisCI has beta support for Android builds](http://docs.travis-ci.com/user/languages/android/),
and setting up iOS testing on
Travis is
[a nightmarish tangle of accounts and certificates](https://www.objc.io/issues/6-build-tools/travis-ci/).
Since your Ionic app is just JavaScript, however, you can test your
AngularJS code in a browser. In this article, you'll use
[karma](https://strongloop.com/strongblog/karma-test-client-side-javascript/)
and
[PhantomJS](https://www.npmjs.com/package/phantomjs)
to test the directives in your mobile app.

Karma Basics
------------

*TLDR; [See a diff for this step on GitHub](https://github.com/vkarpov15/stopwatch-example/commit/1b9cd0ec48e18e0782804c0446c8c74651477127)*

[Karma](https://www.npmjs.com/package/karma) is a browser automation tool
for testing. The general purpose of karma is to start a browser, run some code,
and log the output to the shell. In this section, you'll learn enough about
karma to run a basic directive test in Travis; if you're interested in learning
more, I wrote a
[more detailed guide to Karma on the StrongLoop blog](https://strongloop.com/strongblog/karma-test-client-side-javascript/).

Karma is like gulp; it's a lightweight core that's highly pluggable, but needs
a plugin to do anything non-trivial. In particular, you need plugins to enable
karma to launch specific browsers. For this article, you'll use 2 karma plugins:
one that enables karma to launch PhantomJS, and one that provides an adapter for
the [mocha testing framework](https://www.npmjs.com/package/mocha).

```javascript
devDependencies: {
  "karma": "0.13.15",
  "karma-mocha": "0.2.0",
  "karma-phantomjs-launcher": "0.2.1",
  "mocha": "2.3.3",
  "phantomjs": "1.9.18"
}
```

Once you've installed karma, you'll need to do a little extra work to make your
tests easy to run. You'll need to create a
[separate AngularJS module that contains all the stopwatch-specific logic](https://github.com/vkarpov15/stopwatch-example/commit/1b9cd0ec48e18e0782804c0446c8c74651477127#diff-5)
from the
[third article in this series](https://strongloop.com/strongblog/part-3-ionic-loopback-frameworks-building-the-ionic-app/). Why? Getting the whole Ionic bundle to run in a browser
is unnecessary in this case, because the stopwatch directives don't touch any
Ionic-specific code. All you really need to test is how the directives work
in conjunction with the HTTP interceptors and other Ionic-specific
configuration.

Once you've created this `stopwatch.js` file that contains an AngularJS module
with all of your stopwatch-specific directives, it's time to set up a karma
config file. Karma config files can be intimidating at first, but they make
sense once you remember the 3 things that karma is responsible for: starting
browsers, running some JavaScript, and reporting output.

```javascript
module.exports = function(config) {
  config.set({
    // Start these browsers
    browsers: ['PhantomJS'],
    // Load these files
    basePath: '../',
    files: [
      'http://code.jquery.com/jquery-1.9.1.js',
      'https://cdnjs.cloudflare.com/ajax/libs/chai/3.4.0/chai.js',
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.4.7/angular.js',
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.4.7/angular-resource.js',
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.4.7/angular-mocks.js',
      'https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.10.6/moment.js',
      'www/js/stopwatch.js',
      'www/js/directives/index.js',
      'www/js/templates/index.js',
      // These are all your test files
      'test/*.test.js'
    ],
    frameworks: ['mocha'],
    // And a couple other details
    port: 9876,
    singleRun: true
  });
};
```

The above config assumes that all the tests will be in the `test/` directory.
Let's write a basic mocha test and run it.

```javascript
describe('test', function() {
  it('works', function() {
    assert.equal('A', 'A');
  });
});
```

In order to make karma easier to run, you can create a script in your
`package.json`:

```javascript
"scripts": {
  "test": "karma start test/karma.phantom.conf.js"
}
```

Now, once you run `npm test`, you should see output that looks like this:

```
$ npm test

> stopwatch-example@1.0.0 test
> karma start test/karma.phantom.conf.js

05 11 2015 18:43:30.691:INFO [karma]: Karma v0.13.15 server started at http://localhost:9876/
05 11 2015 18:43:30.699:INFO [launcher]: Starting browser PhantomJS
05 11 2015 18:43:31.357:INFO [PhantomJS 1.9.8 (Linux 0.0.0)]: Executed 1 of 1 SUCCESS (0.038 secs / 0 secs)
```

Testing AngularJS Directives
----------------------------

*TLDR; [See a diff for this step on GitHub](https://github.com/vkarpov15/stopwatch-example/commit/e6c278b3d5a9cf612e112bea38fc1f4874fcac9b)*

No offense to Aristotle, but a test that asserts that
[A is A](http://www.importanceofphilosophy.com/Metaphysics_Identity.html)
is not particularly interesting. Part of what makes AngularJS so powerful
is the ability to test directives from the level of user interactions without
a server. In other words, you can test your directives using jQuery's `.click()`
and `.val()` methods without having to set up a server.

How does this work? The key is
[AngularJS' `$compile` service](https://docs.angularjs.org/api/ng/service/$compile).
If you don't understand the `$compile` docs, don't worry, I don't either.
At a high level, the `$compile` service takes in an HTML string and an AngularJS
scope, and compiles the HTML into a DOM element attached to the given scope.
In other words, the  `$compile` service lets you instantiate your directives.

```javascript
var injector = angular.injector(['stopwatch', 'ngMockE2E']);

injector.invoke(function($rootScope, $compile) {
  parentScope = $rootScope.$new();

  var html = '<timer on-time-saved="onSaved(time);"></timer>';
  element = $compile(html)(parentScope);
  // Can now do things like `element.css('display')` and
  // `element.find('button').click();`
});
```

[The `angular.injector()` function](https://docs.angularjs.org/api/auto/service/$injector)
is what you use to generate your `$compile` service. This creates a new
AngularJS dependency injector from the given modules. Since the injector knows
about the stopwatch module, the `$compile` service will know about the `timer`
directive and give you a jQuery handle to an instantiated `timer` directive.

In order to really run this test, you're going to need three more details.
First, you're going to need to define the `onSaved()` function. This is just
going to be a stub for testing.

```javascript
parentScope.onSaved = function(time) {
  parentScope.onSaved.calls.push(time);
};
parentScope.onSaved.calls = [];
```

Secondly, recall that the `timer` directive creates a new AngularJS scope.
The `parentScope` variable is useful, but what if we want access to the
directive's internals? Thankfully, a scope has a `$$childHead` member that
points to its first child scope.

```javascript
scope = parentScope.$$childHead;
```

Finally, you're going to want to test that clicking on the 'Save' button
triggers the correct HTTP request. Thankfully, that's what AngularJS'
`$httpBackend` service (part of the `ngMockE2E` module you saw above) is for.

```javascript
injector.invoke(function($rootScope, $compile, $httpBackend) {
  parentScope = $rootScope.$new();
  httpBackend = $httpBackend;
});
```

With that, you're ready to write your first test. The full code can be
found on
[GitHub](https://github.com/vkarpov15/stopwatch-example/commit/e6c278b3d5a9cf612e112bea38fc1f4874fcac9b#diff-0).
Let's walk through the high-level concepts in this test. Now that you have the
element, you first want to click on the 'Start' button in the `timer` directive
and make sure the directive reacted correctly.

```javascript
// Click the 'Start' button
element.find('button[ng-click="startTimer()"]').click();
// Make sure the internal state updated
assert.equal(scope.state, 'RUNNING');
assert.equal(scope.ms, 0);
// And make sure the 'Start' button no longer appears
assert.ok(element.find('button[ng-click="startTimer()"]').
  hasClass('ng-hide'));
```

Now, you want to wait a while and make sure the timer updates every second
correctly.

```javascript
setTimeout(function() {
  assert.equal(scope.ms, 1000);
}, 1100);
```

Once the timer has updated to 1 second, your test is going to click the stop
button and assert that the directive reacted correctly.

```javascript
// Click on the 'Stop' button
element.find('button[ng-click="stopTimer()"]').click();
// Make sure the internal state updated correctly
assert.equal(scope.state, 'STOPPED');

// Tell AngularJS to expect an HTTP POST request whose body satisfies
// this function
var validateData = function(data) {
  assert.deepEqual(JSON.parse(data), { time: 1000 });
  return true;
};
httpBackend.expectPOST('http://localhost:3000/api/Times', validateData).
  respond(200, { result: 'success' });

// Click on the 'Save' button and trigger the request
element.find('button[ng-click="save()"]').click();

// Tell AngularJS to respond to the HTTP POST request
httpBackend.flush();

// Make sure the internal state updated correctly
assert.equal(scope.state, 'SUCCESS');
```

If you're interested in learning more, there's a
[detailed guide to testing AngularJS directives on my blog](http://thecodebarbarian.com/2015/06/12/testing-angularjs-directives).

Setting Up Travis
-----------------

*TLDR; [See a diff for this step on GitHub](https://github.com/vkarpov15/stopwatch-example/commit/592d7cb64ff23a3dae465db3d6f95c49e095b76a)*

Once you have tests for your mobile app, you can set up
[Travis](https://travis-ci.org/) to run your tests on every commit to GitHub.
The tests are the hard part, setting up Travis to work with Node is
much easier than Android or iOS. All you need to do is set up an account
on Travis, add your Ionic app's GitHub repo, and add the below `.travis.yml`
file to your repo.

```
language: node_js
node_js:
  - "4"
script: "npm test"
```

Easy, right? If you need extra help setting up Travis, there's a
[detailed guide to setting up Travis for Node.js on the StrongLoop blog](https://strongloop.com/strongblog/npm-modules-travis-coveralls/).

Conclusion
----------

That's a wrap! You've now built a LoopBack REST API, a desktop web client, and
an Ionic Framework mobile app. You even put together a CI setup for your mobile
app. LoopBack and it's corresponding AngularJS SDK enabled you to generate
a REST API and it's corresponding UI components with a few commands and minimal
coding. The Ionic Framework let you leverage these browser-based UI components
to build an easily-testable mobile app. Looks like JavaScript isn't just
for the browser (or the server) anymore.
