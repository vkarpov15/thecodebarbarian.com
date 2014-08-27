My [directives post](http://thecodebarbarian.com/2013/09/23/the-8020-guide-to-writing-angularjs-directives/) seems to have gone over well. I've received emails and comments from readers expressing how much it helped them, so I figured I'd write a post about one of the simultaneously oldest, most useful, and most under appreciated AngularJS features.

What is a filter? A filter is a function that is accessible from within any AngularJS expression in your [app](http://docs.angularjs.org/api/ng.directive:ngApp). Filters are primarily useful for any last-second post-processing your data needs before being displayed to the user. The general high-level structure of an AngularJS application looks like this: controllers handle making the data accessible from a given scope, directives handle the visual rules for displaying and interacting with the data, and filters help directives format the data.

If this sounds a little vague, don't worry, we'll walk through a few examples of common use cases for filters. Filters are much simpler to grasp than directives, but they also have more pitfalls. Each example will also demonstrate a pitfall that you may run into with each design pattern, so hopefully you'll be able to derive all the benefit from filters without any of the headache.

1) Specifying rules for converting an object to a string
-----------------------------

*AngularJS example: The [date filter](http://docs.angularjs.org/api/ng.filter:date)*

*Our example: A pluralize filter, which will allow us to easily encode rules for displaying counts of things, e.g. 1 hour, 2 hours, etc.*

*Alternative example: Convert hashtags to Github issue URLs.*

When building out a UI, you will inevitably run into a place where your UI / UX / design guy decides that the way that data is stored isn't quite conducive to how it should be displayed. Perhaps you have separate fields for first name and last name, but your designer's copy/pasting something like this all over the place:

```
{{user.name.first}} {{user.name.last}}
```

Naturally, as developers, we want to avoid copy/paste as much as possible - what happens when a decision is made to only display the first initial of the last name? Or when a decision is made to only store the first name? Either of these decisions will become a nightmare scenario that could lead to the worst of all programming sins: editing your code using `sed`. Another simple alternative would be to wrap the rule for how a name should be displayed in a function, but where would the function live? I know you weren't thinking of attaching a `formatName()` function to `Object.prototype`. A naive approach would put this function in every single controller that needs it. However, then you have to remember to put this function in every single controller. A much better solution would be to simply use a filter:

```
app.filter('displayName', function() {
  return function(name) {
    return name.first + " " + name.last;
  }
});
```

Now your designer can display the username as

```
{{user.name | displayName}}
```

In addition, your designer can use this functionality to chain filters together to perform simple tasks, like limiting the length of the displayed string to 40 characters, without disrupting two-way data-binding:

```
{{user.name | displayName | limitTo:40}}
```

Lets build a slightly more useful example. Displaying units for a number is very helpful, but displaying text like "today I have performed 1 bench press rep(s)" in your app seems unprofessional. Lets write a filter that will take care of our pluralization needs, appropriately called 'pluralize'. Check it out on [JSFiddle](http://jsfiddle.net/vkarpov15/mC7pd/).

```
angular.
  module('myApp', []).
  filter('pluralize', function() {
    return function(ordinal, noun) {
      if (ordinal == 1) {
        return ordinal + ' ' + noun;
      } else {
        var plural = noun;
        if (noun.substr(noun.length - 2) == 'us') {
          plural = plural.substr(0, plural.length - 2) + 'i';
        } else if (noun.substr(noun.length - 2) == 'ch' || noun.charAt(noun.length - 1) == 'x' || noun.charAt(noun.length - 1) == 's') {
          plural += 'es';
        } else if (noun.charAt(noun.length - 1) == 'y' && ['a','e','i','o','u'].indexOf(noun.charAt(noun.length - 2)) == -1) {
          plural = plural.substr(0, plural.length - 1) + 'ies';
        } else if (noun.substr(noun.length - 2) == 'is') {
          plural = plural.substr(0, plural.length - 2) + 'es';
        } else {
          plural += 's';
        }
        return ordinal + ' ' + plural;
      }
    };
  });
```

Of course, English has some pretty labyrinthine grammar rules, so this filter isn't 100% accurate, but in most cases it will get close enough. This filter will allow us to do things like:

```
All I Need is {{1 | pluralize:'mic'}} // All I need is 1 mic
I've visited {{3 | pluralize:'city'}} // I've visited 3 cities
```

**Pitfall:**

AngularJS escapes HTML in `{{}}`. If you want to modify your string to have any HTML, such as converting hashtags in a git commit to github URLs, you can use the [`ng-bind-html`](http://docs.angularjs.org/api/ng.directive:ngBindHtml) or the [`ng-bind-html-unsafe`](http://code.angularjs.org/1.0.8/docs/api/ng.directive:ngBindHtmlUnsafe) directive, or the [`$compile`](http://docs.angularjs.org/api/ng.$compile) service. There is a minor complication: `ng-bind-html-unsafe` is available in AngularJS 1.0.x, was deprecated somewhere in 1.1.x, and removed completely in 1.2.x, so you have to roll your own `ng-bind-html-unsafe` directive (don't worry, its a simple application of design pattern 1 from the [80/20 Guide to Directives](http://thecodebarbarian.com/2013/09/23/the-8020-guide-to-writing-angularjs-directives/)) if you're using a more recent version and `ng-bind-html` doesn't satisfy your needs.

2) Quick hacks for functions that are not accessible from AngularJS expressions
-------------------------

*Example: encodeURIComponent*

*Example: conditional filter for AngularJS pre-1.1.5*

One strength of AngularJS that sometimes ends up being a weakness is its [extremely dogmatic opposition to all global state](http://docs.angularjs.org/guide/dev_guide.services.creating_services#services-as-singletons). As such, everybody who is new to AngularJS inevitably spends some time trying to figure out why the hell you can't do something like:

```
<a ng-href="/product/{{product.id}}?from={{encodeURIComponent('/products')}}">
  Go To Individual Product Page
</a>
```

This is because AngularJS expressions don't by default have access to the `window` object, i.e. the global scope of the page where `encodeURIComponent` lives, unless you inject `$window` into your controller and explicitly make it accessible from the controller's scope. However, doing this for every single controller is a really bad idea, so the slightly more correct way of making `encodeURIComponent` accessible from an expression is a filter:

```
filter('encodeUri', function() {
  return function(x) {
    return encodeURIComponent(x);
  };
});
```

You can then access this filter using:

```
<a ng-href="/product/{{product.id}}?from={{'/products' | encodeUri}}">
  Go To Individual Product Page
</a>
```

**Pitfall:**

AngularJS' docs specify an [ngIf](http://docs.angularjs.org/api/ng.directive:ngIf) directive, however, this directive is not available in versions before AngularJS 1.1.5, which are still in heavy use. Futhermore, AngularJS expressions don't support if statements or the [ternary operator](http://en.wikipedia.org/wiki/%3F:), i.e. `bool ? t : f`. So what do we do if we want to display a certain bit of text if one condition is true and another bit of text if the condition is false? We could use `ngShow`, but this seems a bit hacky.

The lack of conditional logic in expressions has been the bane of every AngularJS programmers' existence from the very beginning. There is a pretty lively debate in the development community as to whether conditional logic belongs in templates or not. In a random aside, I stumbled across an entertaining flame war on the [Golang google group](https://groups.google.com/forum/#!topic/golang-nuts/OEdSDgEC7js) a few weeks ago. In response, I'm going to stand up on my soapbox and give my two cents:

*Conditional logic is a necessary and fundamental part of any templating language. Your template should have the final say on how your data is displayed. If you have to write imperative code to tell a template whether or not a div should be displayed or what color a header should be, your templating engine sucks.*

Rant aside, in AngularJS we can tie the ternary operator into two-way data-binding using a filter:

```
filter('conditional', function() {
  return function(b, t, f) {
    return b ? t : f;
  };
});
```

With this filter, you can do things like this in your HTML:

```
<a ng-href="{{ isProduct | conditional:'/product/':'/user/'}}{{object.id}}">
  My Object
</a>
```

3) Array manipulation: searching, sorting, limiting
----------------------------

*AngularJS Example: The wonderfully-named [`filter` filter](http://docs.angularjs.org/api/ng.filter:filter)*

*AngularJS Example: The [`orderBy` filter](http://docs.angularjs.org/api/ng.filter:orderBy)*

*Our Example: Partially hardcoding the order of an array*

*Alternative Example: Merge two arrays*

If you're a resident of the US and have ordered something online from a site that isn't Amazon, likely you've experienced some minor annoyance having to scroll to the bottom of a country dropdown to find 'United States' when entering your shipping information. Lets say that you want to streamline your checkout for US customers, and put your country select in alphabetical order except for 'United States' being first. Obviously, there are more than a few ways of doing this, but for the sake of example, lets use a filter.

First off, lets assume that we have a list of countries as an array of objects with have a `name` field, and we're displaying this list as so:

```
<select ng-model="shipToCountry"
        ng-options="country.name for country in countries">
</select>
```

To order the countries alphabetically, we can use the built-in [`orderBy` filter](http://docs.angularjs.org/api/ng.filter:orderBy):

```
<select ng-model="shipToCountry"
        ng-options="country.name for country in countries | orderBy:'name'">
</select>
```

And now, lets write a quick filter that will move the specified country to first in our array:

```
filter('hardcodeFirst', function() {
  return function(arr, field, val) {
    var first = null;
    for (var i = 0; i < arr.length; ++i) {
      if (arr[i][field] == val) {
        first = i;
        break;
      }
    }
 
    if (!first) {
      return arr;
    }
 
    var firstEl = arr[first];
    arr.splice(first, 0);
    arr.unshift(firstEl);
 
    return arr;
  }
});
```

And now we can pipe the result of our `orderBy` into this filter to make sure 'United States' comes first:

```
<select ng-model="countryToShip"
        ng-options="country.name for country in countries | orderBy:'name' | hardcodeFirst:'name':'United States'">
</select>
```

You can see this in action on this [JSFiddle](http://jsfiddle.net/vkarpov15/R9PJL/).

**Pitfall:**

You may be tempted to use the [`ng-init` directive](http://docs.angularjs.org/api/ng.directive:ngInit) to initialize a variable within an `ng-repeat` loop where you're repeating over a filtered array. Try to avoid this temptation, or be very careful if you choose to do it anyway. If you use `ng-init`, you may force AngularJS to re-render, which will cause it to do `ng-init` again, and force an infinite re-rendering loop. This will manifest as the well-known "10 $digest() iterations reached. Aborting!" error, as described [here](http://stackoverflow.com/questions/14376879/error-10-digest-iterations-reached-aborting-with-dynamic-sortby-predicate).

The End
-----------

In my previous post you learned how to use directives. Now you've learned about how to use filters and how to avoid pitfalls, you're one step closer to AngularJS mastery. I want to leave you with one final pitfall we should all avoid when it comes to angularJS filters: not familiarizing yourself with existing filters. AngularJS has a slew of built-in filters, so read what's already available before you go reinvent the wheel.
