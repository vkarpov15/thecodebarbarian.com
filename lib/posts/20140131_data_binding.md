You hear a lot about data binding in AngularJS, and with good reason: its at the heart of everything you do with Angular. I've mentioned data binding more than a few times in my guides to [directives](http://thecodebarbarian.com/2013/09/23/the-8020-guide-to-writing-angularjs-directives/) and [filters](http://thecodebarbarian.com/2014/01/17/the-8020-guide-to-writing-and-using-angularjs-filters/), but I haven't quite explained the internals of how data binding work. To novices, it seems like straight sorcery, but, in reality, data binding is fundamentally very simple.

Scoping out the situation
--------------------

Fundamentally, data binding consists of a set of functions associated with a *scope*. A scope is an execution context for the expressions you write in your HTML. AngularJS scopes behave like scopes in Javascript: a scope contains a set of named variables and is organized in a tree structure, so expressions in a given scope can access variables from an ancestor scope in the tree. However, data binding adds three powerful functions to a scope that enable you to assign an event handler to fire when a variable in scope changes as easily as you assign an event handler to fire when a button is clicked.

* `$watch()`

This function takes an expression and a callback: the callback will be called when the value of the expression changes. For example, lets say our scope has a variable `name`, and we want to update the `firstName` and `lastName` variables every time name changes. With` $watch`, this is trivial:

```
$scope.$watch('name', function(value) {
  var firstSpace = (value || "").indexOf(' ');
  if (firstSpace == -1) {
    $scope.firstName = value;
    $scope.lastName = "";
  } else {
    $scope.firstName = value.substr(0, firstSpace);
    $scope.lastName = value.substr(firstSpace + 1);
  }
});
```

Under the hood, each scope has a list of watchers, internally called `$scope.$$watchers`, which contain the expression and the callback function. The $watch simply adds a new watcher to the `$$watchers` array, which AngularJS loops over when it thinks something that can change the state of the scope.

* `$apply()`

When called without arguments, `$apply` lets AngularJS know that something happened that may have changed the state of the scope, so AngularJS knows to run through its watchers. You usually don't have to call `$apply()` yourself, because directives like `ngClick` do it for you. However, if you're writing your own event handler, like the `swipeLeft` and `swipeRight` directives from my [guide to directives](http://thecodebarbarian.com/2013/09/23/the-8020-guide-to-writing-angularjs-directives/), you need to plug `$apply()` into your event handler. Try removing the `$apply()` calls from the `swipeLeft` and `swipeRight` directives in this JSFiddle and watch as the UI stops responding to swipes.

Some Important Information to `$digest`
-----------------

`$digest()` is the third scope function related to data binding, and it's the most important one. With high probability, you will never actually call `$digest()` directly, since `$apply()` does that for you. However, this function is at the core of all data binding magic, and its internals warrant some careful inspection if you're going to be an AngularJS pro.

At a high level, `$digest()` runs through every watcher in the scope, evaluates the expression, and checks if the value of the expression has changed. If the value has changed, AngularJS calls the change callback with the new value and the old value. Simple, right? Well, not quite, there are a few subtleties.

1. The first subtlety is with the change callback: the change callback itself can change the scope, like we did with the name example in the `$watch()` section. If we had a watcher on `firstName`, this watcher wouldn't fire! This is why `$digest()` is executed in a loop: `$digest()` will repeatedly execute all watchers until it goes through all watchers once without any of the watched expressions changing. In AngularJS internals, a `dirty` flag is set on each iteration of the `$digest()` loop when a change callback needs to be fired. If the dirty flag is not set after an iteration, `$digest()` terminates.

    Of course, the `$digest()` loop described above can run forever, which is very bad. Internally, AngularJS uses a questionably-named field `TTL` (presumably "times to loop") field to determine the maximum number of times a `$digest()` loop will run before giving up. By default, `TTL` is 10, and you will usually not run into this limit unless you have an infinite loop. If you for some reason need to tweak the `TTL`, the AngularJS [root scope](http://docs.angularjs.org/api/ng.$rootScope) has a poorly-documented `digestTtl()` function which you can use to change the `TTL` on a per-page basis. You can read more about this function [here](https://groups.google.com/forum/#!topic/angular/Fn8ujAx2OP4).
1. The second subtlety is another interesting corner case with the change callback: what if the change callback calls `$apply()` or `$digest()`? Internally, AngularJS uses a system of phases to make sure this doesn't happen: an error gets thrown if you try to enter the `$digest` phase while you're already in the `$digest` phase.
1. Remember when we said that AngularJS scopes are organized in a tree structure and a scope can access its ancestor's variables? Well, this means that `$digest()` needs to happen on every child scope in every iteration! Internally, this code is a bit messy in AngularJS, but each iteration of the `$digest()` loop does a depth-first search and performs the watcher check on every child scope. If any child scope is dirty, the loop has to run again!
1. Since Javascript is a single-threaded event-driven language, the `$digest()` loop cannot be interrupted. That means that the UI is blocked while `$digest()` is running, which means two very bad things happen when your `$digest()` is slow: your UI does not get updated until `$digest()` is done running, and your UI will not respond to user input, e.g. typing in an input field, until `$digest()` is done. To avoid a bad case of client side in-`$digest`-ion, make sure your event handlers lightweight and fast.
1. The final and often most overlooked subtlety is the question of what we mean when we say "checks if the value of the expression has changed". Thankfully, AngularJS is a bit smarter than just using Javascript's `===` operator: if AngularJS just used `===`, data binding against an array would be very frustrating. Two arrays with the same elements could be considered different! Internally, AngularJS uses its own `equals` function. This function considers two objects to be equal if `===` says they're equal, if `angular.equals` returns true for all their properties, if `isNaN` is true for both objects, or if the objects are both regular expressions and their string representations are equal. Long story short, this does the right thing in most situations:

    ```
    angular.equals({ a : 1 }, { a : 1 }); //true
    angular.equals({ a : 1 }, { a : 1, b : 2 }); // false
 
    angular.equals([1], [1]); // true
    angular.equals([1], [1, 2]); // false
 
    angular.equals(parseInt("ABC", 10), parseInt("ABC", 10)); // true
    ```

Conclusion
-----------

Hopefully now you don't need to go buy the recently released [ng-book](https://www.ng-book.com/), which promises to teach you the answer to the question "seriously, what the does `$apply` and `$digest` mean?" Data binding seems like magic, but really its just some clever-yet-simple software engineering. You can even build your own version of AngularJS data binding if you follow the steps lined out in this awesome [article](http://teropa.info/blog/2013/11/03/make-your-own-angular-part-1-scopes-and-digest.html). Ideally, now data binding should be a lot less confusing. Good luck and code on!
