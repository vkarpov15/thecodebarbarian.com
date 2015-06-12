Strict unit tests are an interesting subject. They're simple, elegant, and do
a good job of explaining a block of code's assumptions. On the other hand,
nothing is more depressing than staying late at the office writing unit tests.
Furthermore, for a small, fast-moving startup, time spent writing unit tests
is time not spent working on bug fixes, implementing new features, and other
work that moves the needle on your business.

This is because adding a new feature usually involves adding new elements to
your UI, and unit tests won't cover actual DOM interactions. In AngularJS,
adding a new feature often corresponds to writing a new directive (in AngularJS
2, this'll correspond to adding a new component, which is conceptually the
same thing). In this article, I'll show how you can write DOM-level integration
tests for your directives using plain old mocha (no protractor or ngScenario)
and run them in the browser using [Karma](http://thecodebarbarian.com/2015/05/08/testing-client-side-javascript-with-karma).

Testing a Trivial Directive
---------------------------

Let's say you have one trivial directive that displays the number of times its
been clicked using an inline template.

```javascript
var app = angular.module('myApp', ['ng']);

app.directive('counterDirective', function() {
  return {
    controller: 'MyController',
    template: '<div  ng-controller="MyController"' +
              '      ng-click="counter = counter + 1">' +
              'You\'ve clicked this div {{counter}} times' +
              '</div>'
  }
});

app.controller('MyController', function($scope) {
  $scope.counter = 0;
});
```

You can unit test `MyController`, but that's not particularly interesting. The
logic in the HTML is more complex than the logic in JavaScript, which is why
unit testing controllers in AngularJS often feels pedantic. Let's take this
`directive.js` file and test the actual HTML interactions. First, the Karma
config file. Note that you'll need to install the `karma-mocha`, `karma-chai`,
and `karma-chrome-launcher` npm packages for this config file to work properly.

**Shameless Plug:** If you're not familiar with karma, check out
[my guide to testing client-side JavaScript with karma](http://thecodebarbarian.com/2015/05/08/testing-client-side-javascript-with-karma)

```javascript
module.exports = function(config) {
  config.set({
    files: [
      'http://code.jquery.com/jquery-1.11.3.js',
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0/angular.js',
      './directive.js',
      './test.js'
    ],
    frameworks: ['mocha', 'chai'],
    browsers: ['Chrome']
  });
};
```

Why jQuery? Because AngularJS' internal jqLite implementation is *very*
light, so light it
[doesn't include functions like `.click()`](https://docs.angularjs.org/api/ng/function/angular.element#angular-s-jqlite).
For tests like this, it helps to have the convenient jQuery `.click()` syntax.

Now, let's take a look at `test.js`. As mentioned previously, this is just plain
old mocha tests, no AngularJS-specific testing frameworks at all.

```javascript
describe('counterDirective', function() {
  var injector;
  var element;
  var scope;

  beforeEach(function() {
    // Create a new dependency injector using the 'myApp' module
    injector = angular.injector(['myApp']);

    injector.invoke(function($rootScope, $compile) {
      // Get a new scope
      scope = $rootScope.$new();

      // Compile some HTML that uses the directive
      element = $compile('<counter-directive></counter-directive>')(scope);
      scope.$apply();
    });
  });

  it('increments counter when you click', function() {
    assert.equal(element.text(), 'You\'ve clicked this div 0 times');
    element.find('div').click();
    assert.equal(element.text(), 'You\'ve clicked this div 1 times');
  });
});
```

As you can see, the test is pleasantly simple. Bootstrapping AngularJS to
compile the `counterDirective` HTML is straightforward, it's just not something
that the AngularJS docs make clear. All you need to do is create a new
dependency injector that uses your module, get the dependency injector's
`$compile` service, and compile some HTML that uses your directive. Once you
compile and attach a scope, you get back a nice jQuery-like element that you can
manipulate to your heart's content.

Since this code is meant to run through Karma, you can run it in a real browser.
This means that you can effectively TDD your way through
Internet-Explorer-specific bug fixes.

Adding in Template URLs
-----------------------

The above example is interesting, but how often do you actually inline HTML in
your directive definitions? Typically you're going to use `templateURL` and
load your templates as necessary from the server or a CDN. When you use
`templateURL`, you need a little extra work to make this test behave, because
the template will be loaded asynchronously. In order to know when the template's
been successfully loaded, your test is going to need a little extra help in the
form of a scope event.

**Note** this code is a little hacky, but I haven't found a better way. I'm open
to suggestions :)

```javascript
var app = angular.module('myApp', ['ng']);

app.directive('counterDirective', function() {
  return {
    controller: 'MyController',
    templateUrl: '/directive.html'
  }
});

app.controller('MyController', function($scope) {
  $scope.counter = 0;

  // Emit event **after** apply is done
  setTimeout(function() {
    $scope.$emit('MyController');
  }, 0);
});
```

The new `counterDirective` now uses a template loaded over HTTP,
`directive.html`. In order to make it possible for the tests to detect when
the directive template has been loaded, the `$emit()` call above runs
*after* the current `$apply()` loop, so the initial state of the directive
should be rendered when it fires.

Your test can then wait for the 'MyController' event to start interacting
with the directive, using mocha's nice async testing functionality.

```javascript
describe('counterDirective', function() {
  var injector;
  var element;
  var scope;

  beforeEach(function() {
    injector = angular.injector(['myApp']);

    injector.invoke(function($rootScope, $compile) {
      scope = $rootScope.$new();
      element = $compile('<counter-directive></counter-directive>')(scope);
      scope.$apply();
    });
  });

  it('increments counter when you click', function(done) {
    scope.$on('MyController', function() {
      assert.equal(element.text().trim(), 'You\'ve clicked this div 0 times');
      element.find('div').click();
      assert.equal(element.text().trim(), 'You\'ve clicked this div 1 times');
      done();
    });
  });
});
```

In order to get these tests to work, you also need to add a karma proxy to
make sure karma knows where `/directive.html` is:

```javascript
module.exports = function(config) {
  config.set({
    files: [
      'http://code.jquery.com/jquery-1.11.3.js',
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0/angular.js',
      './directive.js',
      './test.js'
    ],
    frameworks: ['mocha', 'chai'],
    browsers: ['Chrome'],
    // So the directive makes an HTTP request to the correct server
    proxies: {
      '/': 'http://localhost:3000'
    }
  });
};
```

Testing HTTP Interactions
-------------------------

Now you can test directives that use `templateUrl`, which covers a broad set of
directives already. The last part is testing directives that make HTTP calls.
Often your HTTP calls will be abstracted out behind services that you can stub
out. However, if you just want to abstract away the server, you can stub out
`$http` using the `$httpBackend` service and the `ngMockE2E` module.

Suppose you added a simple `$http` call to your directive's controller:

```javascript
var app = angular.module('myApp', ['ng']);

app.directive('counterDirective', function() {
  return {
    controller: 'MyController',
    templateUrl: '/directive.html'
  }
});

app.controller('MyController', function($scope, $http) {
  $scope.counter = 0;

  // Make a silly HTTP request that does nothing
  $http.get('/').success(function(data) {
    $scope.data = data;
  });

  // Emit event **after** apply is done
  setTimeout(function() {
    $scope.$emit('MyController');
  }, 0);
});
```

You need to add the `angular-routes.js` file to Karma, so you can use the
`ngMockE2E` module to stub out `$http` properly.

```javascript
module.exports = function(config) {
  config.set({
    files: [
      'http://code.jquery.com/jquery-1.11.3.js',
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0/angular.js',
      // For ngMockE2E
      'https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0/angular-mocks.js',
      './directive.js',
      './test.js'
    ],
    frameworks: ['mocha', 'chai'],
    browsers: ['Chrome'],
    proxies: {
      '/': 'http://localhost:3000'
    }
  });
};
```

And here's your new `test.js`:

```javascript
describe('counterDirective', function() {
  var injector;
  var element;
  var scope;
  var httpBackend;

  beforeEach(function() {
    // For $httpBackend, add 'ngMockE2E'
    injector = angular.injector(['myApp', 'ngMockE2E']);

    injector.invoke(function($rootScope, $compile, $httpBackend) {
      scope = $rootScope.$new();

      // Configure $httpBackend to allow us to access templates from server
      httpBackend = $httpBackend;
      httpBackend.whenGET('/directive.html').passThrough();

      element = $compile('<counter-directive></counter-directive>')(scope);
      scope.$apply();
    });
  });

  it('increments counter when you click', function(done) {
    // And configure $httpBackend to catch the 'GET /' HTTP request
    httpBackend.expectGET('/').respond({ ok: 1 });

    scope.$on('MyController', function() {
      assert.equal(element.text().trim(), 'You\'ve clicked this div 0 times');
      element.find('div').click();
      assert.equal(element.text().trim(), 'You\'ve clicked this div 1 times');

      // Tell AngularJS to respond to the request so we can verify that we
      // handled the response properly.
      httpBackend.flush();
      assert.strictEqual(scope.data.ok, 1);

      done();
    });
  });
});
```

Conclusion
----------

One of the key features of AngularJS is its powerful testing features. Because
of its structure, you can test AngularJS code at just about any level of
abstraction you want, from simple unit tests up to full end-to-end tests. In
this article, you learned how to test directives with DOM integration but
without the server component. This testing paradigm has some neat features.
Since it isn't dependent on server state, you can run tests across multiple
browsers in parallel. Since it relies on karma, you can run tests in real
browsers or in PhantomJS, depending on your needs. Most importantly, you're
testing real user interactions at the level of clicking on DOM elements, which
is awesome if you don't have the time to be pedantic about testing practices.

*The sample code for this article is available on [this blog's GitHub repo](https://github.com/vkarpov15/thecodebarbarian.com/tree/master/bin/sample/20150612)*

*Like this article? Chapter 9 of my upcoming book,
[Professional AngularJS](http://www.amazon.com/Professional-AngularJS-Valeri-Karpov/dp/1118832078/),
is a detailed guide to testing AngularJS applications. It includes
more detail about using karma and ngScenario to test AngularJS
applications, as well as protractor.*
