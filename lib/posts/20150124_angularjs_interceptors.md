HTTP *interceptors* are an impressive AngularJS feature that doesn't get nearly enough press. Interceptors define custom transformations for HTTP requests and responses at the application level.
In other words, interceptors define general rules for how your application processes HTTP requests and
responses.

Sound a little vague? Now you know how I felt scouring the internet for
content about interceptors. The [AngularJS docs on the subject](https://code.angularjs.org/1.2.27/docs/api/ng/service/$http#interceptors) are light on examples and real use
cases. In this article, you'll learn interceptors by example.

Response Interceptors
------------------------

The most basic use case for interceptors is handling [REST API enveloping](http://www.startupcto.com/backend-tech/building-an-api-best-practices). Suppose you have a REST API
that, up until recently, returned the HTTP status as part of the response body.
The [Instagram API](http://instagram.com/developer/endpoints/#structure) is
a good example.

```javascript
{
  "meta": {
    "code": 200
  },
  "data": {
    "name": "Val"
  }
}
```

Suppose the API maintainer decides returning the HTTP status code in
the body is no longer necessary. The new API response would look like this:

```javascript
{
  "name": "Val"
}
```

One approach would be to change every place
where you use `meta.code`. Unfortunately, in a big application, that could be
a tedious task. Enter a simple HTTP interceptor:

```javascript
var m = angular.module('myApp', []);

m.config(function($httpProvider) {
  $httpProvider.interceptors.push(function() {
    return {
      response: function(res) {
        /* This is the code that transforms the response. `res.data` is the
         * response body */
        res.data = { data: data };
        res.data.meta = { status: res.status };
        return res;
      }
    };
  });
});
```

This simple HTTP interceptor demonstrates the basic interceptor syntax.
Interceptors are represented as an array of functions on
[the `$httpProvider` provider](https://docs.angularjs.org/api/ng/provider/$httpProvider). Providers can only be accessed in
`config()` blocks, so you must define your interceptors in a call to
`app.config()`. The interceptor function must return a JSON map which can
contain any of the following 4 keys:

* `request`
* `response`
* `requestError`
* `responseError`

As you saw in the previous example, the `response` property should be a
function that takes a single parameter, the `res` object, and returns a
response object. The above example modifies the `res` object and returns 
it, but you can return a completely new object if you need to. Here's what
the `JSON.stringify()` output looks like for a sample HTTP request:

```
{
  "data": {
    "success": true
  },
  "status": 200,
  "config": {
    "method": "GET",
    "transformRequest": [
      null
    ],
    "transformResponse": [
      null
    ],
    "url": "/sample",
    "headers": {
      "Accept": "application/json, text/plain, */*"
    }
  },
  "statusText": "OK"
}
```

Your `response` function can modify this object in any way it sees fit. In
this particular example, the underlying API changed its output format.
However, the response interceptor abstracts out the API change so your
code can continue to use `response.data.meta.status` indefinitely.

This `status` example is useful for educational purposes, but you're unlikely
to see it in the real world. The primary use case for interceptors in practice 
involves request interceptors and authentication. You'll investigate this use 
case in the next two sections.

Request Interceptors: Setting the `Authorization` Header
-----------------------------------

Suppose you track the currently logged in user with a service called
`userService`. This `userService` contains session credentials that you
want to send to the server with every HTTP request. In this example, you
will attach these credentials in the request `Authorization` header. This
is a heavily simplified version of the
[HTTP Basic Access Authentication protocol](http://en.wikipedia.org/wiki/Basic_access_authentication).

Suppose `userService` looks like this:

```javascript
var m = angular.module('myApp', []);

m.factory('userService', function() {
  return {
    getAuthorization: function() {
      return 'Taco';
    }
  }
});
```

How are you going to tie this service into an interceptor? It's easier than
you think: the interceptor function is tied in to the AngularJS dependency injector.

```javascript
m.config(function($httpProvider) {
  // Pull in `userService` from the dependency injector
  $httpProvider.interceptors.push(function(userService) {
    return {
      request: function(req) {
        // Set the `Authorization` header for every outgoing HTTP request
        req.headers.Authorization =
          userService.getAuthorization();
        return req;
      }
    };
  }
});
```

Thanks to this request interceptor, *all* your outgoing HTTP requests now
have an `Authorization` header. Request interceptors are analagous to
response interceptors: they take a request object and return a request
object, which may or may not be the original `req` parameter. Below is
the `JSON.stringify()` output from a sample `req` object.

```javascript
{
  "method": "GET",
  "transformRequest": [
    null
  ],
  "transformResponse": [
    null
  ],
  "url": "/sample",
  "headers": {
    "Accept": "application/json, text/plain, */*"
  }
}
```

The ability to set the `Authorization` header on every request is useful. But, 
what happens if a user's session times out while they're on your page?
Your server will start returning HTTP 401's, and your user's requests will
start failing. You could just redirect the user to a login page, but then
the original request gets lost. The last section, about error interceptors,
will show you how to handle this case gracefully.

Error Interceptors: Fun with Promises
----------------------------

The goal of this section is to handle session timeouts gracefully. Suppose
your server returns an HTTP 401 ("Unauthorized"). With error interceptors,
you can prompt the user to log in and retry the original HTTP request once
they've entered in their credentials!

Error interceptors make heavy use of [promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
If you're unfamiliar with promises, [here is a reasonable introduction](https://spring.io/understanding/javascript-promises).
Note that interceptors assume [ES6](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
style promises, relying primarily on the `.then()` function. Thus most
error interceptors will rely on AngularJS' [`$q` service](https://docs.angularjs.org/api/ng/service/$q), which is a port of the popular
[promises library `q`](https://www.npmjs.com/package/q). In theory, you
can use promises libraries like `q` or
[Bluebird](https://www.npmjs.com/package/bluebird) with error interceptors.
You can even use promises returned by the `$http` service,
because [`$http` promises have a `.then()` function](https://docs.angularjs.org/api/ng/service/$http#usage). For
instance,

```javascript
$http.get('/sample').
  success(function(data, status, headers, config) {
  });
```

is equivalent to

```javascript
$http.get('/sample').
  then(function(res) {
    // Use res.data, res.status, res.headers, res.config
  });
```

So what does a `requestError` interceptor look like? Below
is the interceptor that will handle HTTP 401's.

```javascript
m.config(function($httpProvider) {
  $httpProvider.interceptors.push(function($q, $injector, userService) {
    return {
      request: function(request) {
        request.headers.authorization =
          userService.getAuthorization();
        return request;
      },
      // This is the responseError interceptor
      responseError: function(rejection) {
        if (rejection.status === 401) {
          // Return a new promise
          return userService.authenticate().then(function() {
            return $injector.get('$http')(rejection.config);
          });
        }

        /* If not a 401, do nothing with this error.
         * This is necessary to make a `responseError`
         * interceptor a no-op. */
        return $q.reject(rejection);
      }
    };
  });
});
```

The above code assumes the `userService.authenticate()` 
function returns a `then()`-able promise around the
user entering their password. If that condition is met,
the above interceptor is sufficient to gracefully handle
session timeouts. If the server returns an HTTP 401, this
interceptor will prompt the user to log in and return a
new promise. This new promise wraps the user logging in
*and* the `$injector.get('$http')(rejection.config)` call, 
which is responsible for retrying the HTTP request. Thanks
to the magic of promises, the returned promise resolves
if and only if the user authenticates and the retried
HTTP call succeeds.

The above example will continue to retry so long as the
HTTP request fails. This is because HTTP interceptors are
triggered on *every* HTTP request, including HTTP requests
triggered by interceptors. If the user enters an
incorrect password, you can still resolve the
`userService.authenticate()` promise. The HTTP interceptor
will then ask the user to authenticate again and continue
to retry the HTTP request!

All that's left is to implement a suitable
`userService.authenticate()` function. Thankfully, this
is a simple task with
[Angular-UI Bootstrap's `$modal` service](http://angular-ui.github.io/bootstrap/#/modal).
To open a modal with this service, you call `$modal.open()`. The return value of `$modal.open()` has a `result`
property that wraps the "submit the modal" operation in
a promise. Thus, you can implement the
`userService.authenticate()` function as shown below.

```javascript
var authenticate = function() {
  var $modal = $injector.get('$modal');

  var modal = $modal.open({
    template: '<div style="padding: 15px">' +
              '  <input type="password" ng-model="pwd">' +
              '  <button ng-click="submit(pwd)">' +
              '    Submit' +
              '  </button>' +
              '</div>',
    controller: function($scope, $modalInstance) {
      $scope.submit = function(pwd) {
        $modalInstance.close(pwd);
      };
    }
  });

  /* `modal.result` is a promise that gets resolved when 
   * $modalInstance.close() is called */
  return modal.result.then(function(pwd) {
    password = pwd;
  });
};
```

That's it! Now that you have a promise wrapper around the 
user logging in, your error interceptor can handle HTTP
401's gracefully. In practice, your `authenticate()`
function will likely make an HTTP request to the server
to get a new session. But, this example is sufficient
to demonstrate how you would make the HTTP interceptor
portion work. Happy intercepting!

*If you liked this article, check out my upcoming book,
[Professional AngularJS](http://www.amazon.com/Professional-AngularJS-Valeri-Karpov/dp/1118832078/ref=sr_1_1?ie=UTF8&qid=1421864096&sr=8-1&keywords=professional+angularjs).
The book contains a thorough overview of HTTP in AngularJS, as well as guides
for integrating with web sockets and [Firebase](https://www.firebase.com/).*

[<img src="//i.imgur.com/0UWUUOd.jpg">](http://www.amazon.com/Professional-AngularJS-Valeri-Karpov/dp/1118832078/ref=sr_1_1?ie=UTF8&qid=1421864096&sr=8-1&keywords=professional+angularjs)
