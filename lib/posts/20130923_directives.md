AngularJS is blowing up right now, and with good reason. There's nothing more satisfying than using AngularJS to turn 1,000 messy lines of Backbone.js and jQuery spaghetti code into a trivial 10 lines. To put it in a broader context, you can think of AngularJS' place in the world this way: AngularJS is to jQuery as C++11 is to x86 Assembly. However, your quest to capture all the wonderful benefits of AngularJS may be hindered because the documentation is a bit difficult to wrap your mind around. In particular, many readers have told me that the documentation for directives is pretty intimidating, and a lot of experienced users still don't quite grok how to use them properly.

First of all, let's take a moment to recognize that you're almost certainly not the only one confused.  Even I sometimes have trouble distinguishing between compile and link, or figuring out how the hell *ngTransclude* works- and I've been working with AngularJS since version 0.9.4 in late 2010. You'll find that AngularJS directives roughly follow the [Pareto Distribution](http://en.wikipedia.org/wiki/Pareto_distribution) - 80% of the directives that you want to build will only use 20% of the features and design patterns that are available. In other words, don't worry too much about understanding every little detail of directives. Think about git- how many programmers truly understand all the internals of interactive rebasing as opposed to simply doing pull and push to Github?

For most of you, the reason that you're writing directives is probably pretty straightforward, such as to integrate with existing Bootstrap modules and jQuery extensions, or to DRY up your UI. In this post, I'll lay out the basic idea behind AngularJS directives, demonstrate what they do with roughly corresponding jQuery code, and provide you with enough knowledge to develop some pretty sophisticated directives.

Your First Directive: Setting a Background Image
---------------------------------

At the highest level, a directive allows you to wire your custom UI components in to AngularJS's two-way data-binding and scoping features, allowing you to define easily reusable ways for your users to view and interact with your underlying data. By default, a directive is a function that is run on every element with a particular attribute. This function takes as parameters the associated element and the AngularJS scope that this element is in. Let's start out with an extremely simple example: setting the minimum height and width of an image while preserving its aspect ratio. There are several ways to do this, but the easiest is to make set the image as the background of a div using the following CSS:

```
.fill-bg {
  background-image: url('MYURLHERE');
  background-size : 'cover';
  background-repeat : 'no-repeat';
  background-position : 'center center';
}
```

Now let's say we wanted to automate this process, so that our designers don't have to write a separate CSS class for each image. We'll do this by adding an attribute called 'cover-background-image' to some divs so our Javascript knows which image to set as the background. We can do this with jQuery or AngularJS, but lets do jQuery first. The general idea looks like this [(see it in action on JSFiddle)](http://jsfiddle.net/vkarpov15/BQvbg/1/):

```
$('div[cover-background-image]').
  each(function(i, el) {
    $(element).css({
      'background-image': 'url()',
      'background-size': 'cover',
      'background-repeat': 'no-repeat',
      'background-position': 'center center'
    });
  });
```

The general process will be the same with a directive - AngularJS calls your custom directive code for each element with a given attribute. Below is the equivalent directive in AngularJS, and on [JSFiddle](http://jsfiddle.net/vkarpov15/NE9cu/):

```
var m = angular.module('myApp', []).
m.directive('myBackgroundImage', function () {
  return function (scope, element, attrs) {
    var url = 'url(' +
      attrs.myBackgroundImage + ')';
    var pos = 'center center';
    element.css({
      'background-image': url,
      'background-size': 'cover',
      'background-repeat': 'no-repeat',
      'background-position': pos
    });
  };
});
```

Making The Directive Dynamic
------------------------

At this point some of you might be thinking, "Hey, the only difference is that AngularJS requires more code!" This is true for a relatively simple example like the one above. However, the real advantage to the AngularJS approach comes when you introduce two-way data-binding and the power of AngularJS scopes. Lets say that we want to introduce some carousel behavior to this image (switching the image every 5 seconds and allowing the user to navigate between images). In jQuery, supporting multiple carousels on the same page turns out to be a huge pain, because we have no easy way for mapping which images and which buttons belong to which carousel. When you try it the hard way, things end up looking a little something like this [JSFiddle](http://jsfiddle.net/vkarpov15/DDnUt/):

```
$(document).ready(function () {
  $('div[cover-background-image]').
    each(function (i, el) {
      var ctr = -1;
      var images = eval(
        $(el).attr('cover-background-image'));
      var name = $(el).attr('carousel-name');
      var nextImage = function() {
        ctr = (ctr + 1) % images.length;
        var url = 'url(' + images[ctr] + ')';
        $(el).css({
          'background-image': url,
          'background-size': 'cover',
          'background-repeat': 'no-repeat',
          'background-position': 'center center'
        });
      };
      var previousImage = function() {
        ctr = (ctr - 1);
        if (ctr &amp;lt; 0) {
          ctr = images.length - 1;
        }
        var url = 'url(' + images[ctr] + ')';
        $(el).css({
          'background-image': url,
          'background-size': 'cover',
          'background-repeat': 'no-repeat',
          'background-position': 'center center'
        });
      };
      $("div[carousel-next='" + name + "']").
        each(function (i, el) {
          $(el).click(function() {
            nextImage();
          });
        });
      $("div[carousel-prev='" + name + "']").
        each(function (i, el) {
          $(el).click(function() {
            previousImage();
          });
        });
      nextImage();
      var nextImageTimeout = function() {
        nextImage();
        setTimeout(nextImageTimeout, 5 * 1000);
      };
      setTimeout(nextImageTimeout, 5 * 1000);
    });
});
```

As you can see, this is pretty quickly getting a bit more complex than we'd like. More importantly, we've needed to hard-code the *my-background-image* pseudo-directive with certain properties that will make our lives difficult later.

First of all, we require the input of an array of images to be cycled. That may be fine for this specific application, but what if we want to re-use this code for a single image with no cycling? Then we've got a timer that's doing nothing. Furthermore, putting an array variable in 'my-background-image' requires that the variable be visible from the scope of the jQuery code. This leads to both headaches and lots of image arrays in the global scope. Finally, lets say that we want to add additional behaviors, such as swipe handling via [Hammer.js](http://eightmedia.github.io/hammer.js/). It becomes difficult to configure this behavior on a per-carousel basis - what if we have some carousels that should have swipe recognition and some that shouldn't?

Now that we've seen the difficulties that come with trying to make customizable and reusable UI behaviors and components, lets see how AngularJS provides us with the right framework and tools to do this task easily. Here's the first of four design patterns that you'll see frequently with AngularJS directives. With each pattern, I'll describe to you how the pattern works, and provide examples of this pattern in action both in my own JSFiddles and what others have written.

Basic Directive Design Pattern: Watch and Update
-----------------------------------

*Example: Display a cropped image using CSS and update it whenever the underlying variable changes*

*Alternative Example: [angular-ui/bootstrap's progressbar directive](https://github.com/angular-ui/bootstrap/blob/master/src/progressbar/progressbar.js)*

One design pattern you'll see frequently with AngularJS directives is "Watch and Update:" watching a single value and updating the DOM when this value changes to reflect our internal state. Often this can be taken care of using combinations of the built-in [`ngClass`](http://docs.angularjs.org/api/ng.directive:ngClass) and [`ngStyle`](http://docs.angularjs.org/api/ng.directive:ngStyle) directives, but for more complex manipulations you may want to use your own directive to make sure your code is DRY. Our new myBackgroundImage directive will use a very simple "watch and update" pattern (view on [JSFiddle](http://jsfiddle.net/vkarpov15/B6kUJ/)):

```
angular.
module('myApp', []).
directive('myBackgroundImage', function () {
  return function (scope, element, attrs) {
    scope.$watch(attrs.myBackgroundImage,
      function(v) {
        element.css({
          'background-image': 'url(' + v + ')',
          'background-size': 'cover',
          'background-repeat': 'no-repeat',
          'background-position': 'center center'
        });
      });
  };
});
 
function CarouselController($scope, $timeout) {
  $scope.images = [];
  $scope.image = ""
  $scope.index = 0;
 
  $scope.setImages = function(images) {
    $scope.images = images;
    $scope.image = images[0];
    $scope.index = 0;
  };
 
  $scope.nextImage = function() {
    $scope.index = ($scope.index + 1) %
      $scope.images.length;
    $scope.image = $scope.images[$scope.index];
  };
 
  $scope.prevImage = function() {
    $scope.index = ($scope.index - 1 >= 0 ?
      $scope.index - 1 :
      $scope.images.length - 1);
    $scope.image = $scope.images[$scope.index];
  };
 
  var nextImageTimeout = function() {
    $scope.nextImage();
    $timeout(nextImageTimeout, 5 * 1000);
  };
 
  $timeout(nextImageTimeout, 5 * 1000);
}
```

With two-way data-binding, our directive changes very minimally from the previous example. Instead of taking the `my-background-image` attribute as a vanilla string, we tell AngularJS to interpret it as a variable and watch its value with a `scope.$watch` call. When the value changes, we update our CSS. We then move the carousel functionality to an AngularJS controller, so that we can reuse our directive in other non-carousel contexts. As you can see in the JSFiddle, we added an "Add Image" button that pushes another image to the top carousel's images collection, allowing the carousel to update automatically.

Most importantly, AngularJS handles scoping for us, meaning that we can reference functions within the AngularJS controller from our HTML. Imagine trying to do something similar with onclick and jQuery - we would have to get very creative with refactoring our code to take all of our user behaviors out of `myBackgroundImage`.

Now that we've gotten the carousel functionality, it's simple enough to add an `ngSwipe` directive to our AngularJS module that will enable our users to navigate between images with swipes. Speaking of which:

Basic Directive Design Pattern: Wiring External Event Handlers to call `$apply`
-----------------------------------------

*Example: Writing a directive to wire Hammer.js swipeleft and swiperight with AngularJS*

*Alternative Example: [Hooking up the Google Places Autocomplete with AngularJS](http://jsfiddle.net/mwDQr/1/)*

Another common task in writing AngularJS directives, especially when integrating with non-AngularJS libraries, is hooking up event handlers to update your AngularJS scope. Without going into too much detail about AngularJS' internals, each scope has:

1. An `$apply` function that notifies AngularJS when some event has happened that may require updating the view.
1. An `$eval` function, which does a safe eval on its parameter in the scope.

When you include external event handlers, such as the `.on()` calls that many jQuery plugins support, AngularJS does not know that they exist, so your directive needs to tell AngularJS how to handle them. In our case, lets hook up a directive that will listen to Hammer.js's swipe left and swipe right events (view on [JSFiddle](http://jsfiddle.net/vkarpov15/5vajr/) - you don't need a phone or tablet to trigger a swipe event, just drag your mouse quickly across one of the images):

```
angular.
  module('myApp', []).
  directive('myBackgroundImage', function () {
    return function (scope, element, attrs) {
      scope.$watch(attrs.myBackgroundImage,
        function(v) {
          var url = 'url(' + v + ')';
          element.css({
            'background-image': url,
            'background-size': 'cover',
            'background-repeat': 'no-repeat',
            'background-position': 'center center'
          });
        });
    };
  }).directive('swipeLeft', function() {
    return function(scope, element, attrs) {
      $(document).ready(function() {
        Hammer(element).on('swipeleft', function() {
          scope.$eval(attrs.swipeLeft);
          scope.$apply();
        });
      });
    };
  }).directive('swipeRight', function() {
    return function(scope, element, attrs) {
      $(document).ready(function() {
        Hammer(element).on('swiperight', function() {
          scope.$eval(attrs.swipeRight);
          scope.$apply();
        });
      });
    };
  });
```

The calls to `$eval` evaluate the `swipeRight` and `swipeLeft` attributes, which will typically be function calls. For example, in our [little carousel JSFiddle](http://jsfiddle.net/vkarpov15/5vajr/), these calls will look something like this:

```
<div  my-background-image='image'
      swipe-left='nextImage()'
      swipe-right='prevImage()'>
</div>
```

Notice that in the second image, we only allow the user to swipe left, whereas on the first one we allow swiping both left and right. Our `swipeLeft` and `swipeRight` directives are completely decoupled from the actual carousel implementation - we can use them anywhere to handle any sort of action we want to take when the user swipes on any element.

In contrast, this is a far cry from the mostly equivalent jQuery implementation ([view on JSFiddle](http://jsfiddle.net/vkarpov15/GWZj3/)), where we declare our Hammer.js handlers in jQuery (lines 46 and 47) and have no way of reusing them from HTML. We also have no easy way of allowing only "swipe left" without having to deal with some sort of configuration object. One potential alternative is to expose swipe left and swipe right as separate attributes (similar to our approach with the `cover-background-image` function), but then we run into a brick wall with scoping - we don't have an easy way to allow these event handlers to access the `previousImage` and `nextImage` functions within the `cover-background-image` code.

Basic Directive Design Pattern: Combining "watch and update" with `$eval` on an external event handler
------------------------------------------

*Example: Wiring bootstrap-slider to work with AngularJS*

*Alternative Example: [angular-ui/bootstrap's btnRadio directive](https://github.com/angular-ui/bootstrap/blob/master/src/buttons/buttons.js)*

Most directives will need data to go both ways. You will need to a) update your view to reflect internal state, and b) define some set of UI-accessible user behaviors that can update the internal state.

First, take a look at [bootstrap-slider](http://www.eyecon.ro/bootstrap-slider/). This slider is a simple drag-and-drop interface for setting numerical values. We're going to use it for controlling which image is displayed in our image carousel. The directive looks like this (view on [JSFiddle](http://jsfiddle.net/vkarpov15/zn5AM/)):

```
angular.
  module('myApp', []).
  directive('bootstrapSlider', function() {
    return function(scope, element, attrs) {
      $(document).ready(function() {
        var init = scope.$eval(attrs.ngModel);
        var min = scope.$eval(
          attrs.bootstrapSliderMin);
        var max = scope.$eval(
          attrs.bootstrapSliderMax);
        $(element[0]).slider({
          value : init,
          min : min,
          max : max,
          tooltip : 'hide'
        });
 
        // Update view to reflect model
        scope.$watch(attrs.ngModel, function(v) {
          $(element[0]).slider('setValue', v);
        });
 
        // Update model to reflect view
        $(element[0]).slider().on('slide',
          function(ev) {
            scope.$apply(function() {
              scope[attrs.ngModel] = ev.value;
            });
          });
      });
    };
  });
```

The general idea here is that we do both of the first two design patterns in a single directive. We first initialize the slider using:

```
$(element[0]).slider({ /*config options */ });
```

Then we use the `.on()` event handler to watch for changes in the view, and update `ngModel` to reflect these changes. Note how we make sure to call `scope.$apply` so that AngularJS knows that something happened.

You may have noticed that we don't bother with handling updates to the `bootstrapSliderMin` and `bootstrapSliderMax` fields. The `bootstrap-slider` component doesn't support updating these attributes and improving `bootstrap-slider` is beyond the scope of this post.

Basic Directive Design Pattern: Creating Components with Nesting And Templating
---------------------------------------------

*Example: The entire carousel as one directive*

*Alternative Example: [angular-ui/bootstrap's rating directive](https://github.com/angular-ui/bootstrap/blob/master/src/rating/rating.js)*

So far we've put together some very nice decoupled components that we can reuse anywhere. To review:

1. We can attach our `swipeLeft` and `swipeRight` directives to any element.
1. We can easily put in a slider and bind it to any value.
1. We can display any image cropped to fill a given `div`.
1. We can wire these behaviors together in any way we want.

So what if we're going to reuse our carousel over and over again in the same form, and we'd like to keep our UI nice and DRY? Easy! We just need to create a single new directive that wires together all the previous directives into a single carousel directive. If you read the [AngularJS directives documentation](http://docs.angularjs.org/guide/directive), this type of directive is loosely referred to as a component. The term component is not particularly well defined in the context of directives, but you can generally take it to mean a directive which has its own controller and thus can find its own data. A component has the general implication that it needs little to no external data to do its job properly, essentially something that you can put into a page and just let it run in isolation (view on [JSFiddle](http://jsfiddle.net/vkarpov15/NGDzm/)).

```
var template =
  "<div my-background-image='images[index]'" +
  "     class='tall'" +
  "     swipe-left='nextImage()'></div>" +
  "<div ng-click='prevImage()' class='pointer'>" +
  "  Prev" +
  "</div>" +
  "<div ng-click='nextImage()' class='pointer'>" +
  "  Next" +
  "</div>" +
  "<div id='mySlider'>" +
  "  <div bootstrap-slider='true'" +
  "       ng-model='index'" +
  "       bootstrap-slider-min='0'" +
  "       bootstrap-slider-max='images.length - 1'>" +
  "  </div>" +
  "</div>";

directive('carousel', function() {
 return {
   restrict : 'E',
   require : 'ngImages',
   scope : {
     images : '=ngImages'
   },
   controller : CarouselController,
   template : template,
   link : function(scope, element, attrs) {}
 };
});
```

The big difference here is that instead of returning a plain function, we're now returning an object with a bunch of options. Here's a brief walkthrough of what the above jibber-jabber actually does:

* `restrict : 'E'` means that this directive can only be used as an element. For example,
```
<carousel ng-images="[]" />
```
will work, but
```
<div carousel="true" ng-images="[]" />
```
won't. Other possible values of this option are detailed in http://docs.angularjs.org/guide/directive
* `require : 'ngImages'` states that the `<carousel>` element must have an `ng-images` attribute; otherwise this directive will not be used on that element.
* `Scope : { images : '=ngImages' }` shows that the directive will create a new scope. That scope will have an `images` variable that is two-way data-bound to the resulting value of `ngImages`.
* `Controller: 'CarouselController'` will wrap the template in an element that has `ng-controller="CarouselController"`
* `template: ...` will populate the `<carousel>` element's inner HTML. Note that it can access `CarouselController`'s functions.
* `Link : ...` Here, the
```
return function(scope, element, attrs) {}
```
syntax that we used in the first three paterns is a convenient shorthand for:
```
return {
  link : function(scope, element, attrs) {}
};
```
AngularJS lets you do different things with your directive at different steps of its internal processing, providing options like `preLink`, `postLink`, `compile`, etc. If you're curious, you can read more about them [here](http://docs.angularjs.org/guide/directive), but most of the time you can get away with just using `link` until you become an AngularJS whiz.

Finally, note that in the fiddle, we replaced one carousel with the carousel directive:

```
<carousel ng-images='["http://images2.wikia.nocookie.net/__cb20110811172434/fallingskies/images/f/fd/Totoro_normal.gif", "http://fc03.deviantart.net/fs28/i/2009/250/7/4/MUSASHI_MIYAMOTO_by_BARCYD.jpg", "http://fc08.deviantart.net/fs71/f/2012/066/3/5/goku_happy_by_kzo-d4s20sy.png";]' />
```

while leaving the other one in the old form:

```
<div  ng-controller="CarouselController"
      ng-init='setImages(["http://images2.wikia.nocookie.net/__cb20110811172434/fallingskies/images/f/fd/Totoro_normal.gif","http://images.wikia.com/pokemon/images/archive/4/49/20110526012846!Ash_Pikachu.png","http://images2.wikia.nocookie.net/__cb20111231185621/trigun/images/2/2b/Vash1.jpg"])'>
  <div  my-background-image='images[index]'
        class="wide"
        swipe-left="nextImage()"
        swipe-right="prevImage()">
  </div>
  <div ng-click="prevImage()" class="pointer">
    Prev
  </div>
  <div ng-click="nextImage()" class="pointer">
    Next
  </div>
  <div  ng-click="images.push('http://upload.wikimedia.org/wikipedia/en/5/59/Himura_Kenshin_OVA.jpg');"
        class="pointer">
    <em>Add Image</em>
  </div>
</div>
```

This illustrates the tradeoff between flexibility and convenience when defining a universal `<carousel>` directive.  In many cases, that initial work we did to combine the definitions of slider, background image, and swipe directives into a single `<carousel>` template will save an enormous amount of hassle later.  However, it's important to recognize the weakness of using a template for your directive- there is no good way to override that template.  Once you define the template, anything using that `<carousel>` directive will look and behave exactly like the original definition unless you change the template itself.  Personally, I like to separate directives as much as possible for the sake of flexibility, but every project is different so do whatever works for your application.

Special Bonus Rule #1: Directives are already hard, keep them simple. Don't ping the server or reformat underlying data.
--------------------------------------

A brief aside on code modularity: a directive's functions should almost never be responsible for getting or formatting their own data.  There's nothing to stop you from using the `$http` service from within a directive, but this is almost always the wrong thing to do.  Writing a controller to use `$http` is the right way to do it. A directive already touches a DOM element, which is a very complex object and is difficult to stub out for testing.  Adding network I/O to the mix makes your code that much more difficult to understand and that much more difficult to test. In addition, network I/O locks in the way that your directive will get its data - maybe in some other place you'll want to have this directive receive data from a socket or take in preloaded data.  Your directive should either take data in as an attribute through scope.$eval and/or have a controller to handle acquiring and storing the data.

The End
---------------

So, do you feel like a master of AngularJS directives yet? So far we've covered the basics of AngularJS directives and the design patterns that go into writing simple ones. Hopefully this blog post will help to reduce the endless wave of Stack Overflow questions asking, "how do I integrate jQuery plugin X with AngularJS?" If you came across this article because someone linked to it from Stack Overflow, welcome! By reading this far, you've probably already come across the answer you needed.  If not, leave a comment about your problems and I will be happy to help you figure it out.

*Chances are that for every question I just answered in this post, you now have three more. What do you want to learn next? What sorts of examples would you like to see in the next blog post? How are you successfully applying the MEAN Stack in your application? Let me know in the comments below!  You can also follow me on Twitter at @Code_Barbarian for random programming insights, news about the MEAN Stack from around the world, and occasional pictures of me eating absurd quantities of food. As always, big thanks to my partners William Kelly (@idostartups) and Cesar Devers (@Cesar_Devers) for their help in putting this post together.*
