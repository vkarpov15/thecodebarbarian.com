Hating "callback hell" is a favorite pastime for many JavaScript bloggers and open source devs.
There are numerous modules out there, like
[async](http://npmjs.org/package/async),
[zone](http://npmjs.org/package/zone), and the various promise libraries,
that promise to save you from the callback monster that's coming to eat your
lunch. Even I've been experimenting with
[my own async framework](https://www.npmjs.com/package/wagner-core).
Yet, in my
experience, true callback hell is a symptom rather than a problem, and, unless
you address the underlying problem, using a library like async will just
postpone the inevitable.

What's the Underlying Problem?
------------------------------

When I first started using [the async module](http://npmjs.org/package/async),
it felt like a dream come true. The
[`waterfall()` function](https://www.npmjs.com/package/async#waterfall)
became my new best friend. But, as the codebase grew and others started
contributing, the code started becoming more and more tangled. Pretty soon I
had `async.series()` and `async.parallel()` calls inside calls to `waterfall()`
and the code was even more unmaintainable than before I started using async.
But at least I didn't have callback hell, right?

Not exactly. My problem was not that I had nested callbacks, my problem was
that
[my functions were doing too much](http://misko.hevery.com/code-reviewers-guide/flaw-class-does-too-much/).
Async helped me sweep this problem under the rug for a time, but the poor code
organization ended up coming back to bite me. Too often async and promises are
used as a panacea to save codebases from bloated code and bad software design.

<img src="http://i.imgur.com/DEg3cPZ.png" style="width: 300px">

Why I Love Callbacks
--------------------

People are always confused when I say I love NodeJS in spite of the fact that I
agree (at least in spirit, if not the exact number) with [
Linus Torvalds' quip](http://en.wikiquote.org/wiki/Linus_Torvalds#1995-99)
"if you need more than 3 levels of indentation, you're screwed anyway, and
should fix your program." Part of the reason why I loved NodeJS from the
beginning was that callbacks are just enough of a pain to write.

Much like how the pain of your hands burning means you mistakenly picked up a
hot pot in the kitchen, or a headache in the morning means you drank too much
last night, the pain of dealing with 10 layers of nested callbacks in a single
function means you desperately need to refactor. The small friction introduced
by writing a callback is just enough to make you twice about "is this extra I/O
really necessary, or can I design this in a better way?"" I still prefer to use
a framework like async or promises to make code more readable. But, if you're
counting on promises or `async.waterfall()` to save you from banana code, the
problem is probably more with your software design than with your asynchronous
programming framework.

How To Use Callbacks Badly
--------------------------

Let's take a look at a couple "pyramid of doom" examples I pulled down from
Google images. Here's a typical
[callback hell example borrowed from a post on medium.com](https://medium.com/@mlfryman/to-survive-the-pyramid-of-doom-4e8ce4fb5d6b).

<img src="http://i.imgur.com/MByWioX.png" style="width: 660px">

If you ignore this code's numerous other glaring issues, you'll see that
callbacks aren't the problem here, the lack of sane abstractions is. Look
carefully: does chair really need to be saved after table is done saving?
Furthermore, there are programming constructs that enable you to not have to
list out every Item explicitly; they're called `for` loops. If you're using
[mongoose](http://npmjs.org/package/mongoose),
you would just use
[the `create()` function](http://mongoosejs.com/docs/api.html#model_Model.create).
Even without mongoose, `async.parallel()`, or `promise.all()`, you can write a
simple function to make this much cleaner.

```javascript
function create(items, callback) {
  var numItems = items.length;
  var done = false;
  for (var i = 0; i < items.length; ++i) {
    items[i].save(function(error) {
      if (done) {
        return;
      }
      if (error) {
        done = true;
        return callback(error);
      }
      --numItems || callback();
    });
  }
}
```

An alternative solution using simple recursion makes for a more concise solution
(12 SLOC, 4 branches) that maintains the behavior of the original code. Just
another case where
[young developers should practice algorithms more](https://sites.google.com/site/codetrick/superprimerib)
and spend less time building iPhone apps.

```javascript
function create(items, callback, index) {
  index = index || 0;
  if (index >= items.length) {
    callback();
  }
  items[i].save(function(error) {
    if (error) {
      return callback(error);
    }
    create(items, callback, index + 1);
  });
}
```

Another example I pulled down that's a bit less trivial comes from this
[presentation on wrangling callback hell with async](http://slides.com/michaelholroyd/asyncnodejs#/).
Click on the image to zoom in a little more, if you dare.

<a href="http://i.imgur.com/EGGwaXP.png">
  <img src="http://i.imgur.com/EGGwaXP.png" style="width: 660px">
</a>

This case is a classic example where the single function is responsible for
doing way too much, otherwise known as the
[God object anti-pattern](http://en.wikipedia.org/wiki/God_object).
As written, this function does a lot of tangentially related tasks:

* registers a job in a work queue
* cleans up the job queue
* reads and writes from S3 with hard-coded options
* executes two shell commands
* etc. etc.

The function does way too much and has way too many points of failure.
Furthermore, it skips error checks for many of these. Promises and async have
mechanisms to help you check for errors in a more concise way, but odds are,
if you're the type of person who ignores errors in callbacks, you'll also
ignore them even if you're using `promise.catch()` or `async.waterfall()`.
Callback hell is the least of this function's problems.

Even if you wrote it in Python or Ruby, this function is a nightmare to test
and debug. How would you improve this function to make it more durable and
easier to test, debug, and understand?

* First you'd start by abstracting out the code that manages `beanstalkd` - the
code that inserts tasks into a job queue has no business being in the same
function as your business logic. Separation of concerns! The maximum indentation
in the code as written is 30 (15x2). Creating a separate function that
handles everything from L62-92 and making beanstalk call that function reduces
maximum indentation to 20 (10x2).
* Adding an abstraction for "download this object in S3, unzip it, and put it
into this directory, and create this directory if it doesn't exist" will reduce
the maximum indentation to 14 (7x2). Since `mkdirs` creates directories
recursively, you can simply save yourself the extra fs call and tell your S3
download code to create the `/orig` directory and bring it down to 12 (6x2).
* Finally, you can create a function that handles
"read this file and upload it to S3" and reduce your maximum indentation to
10 (5x2).

By breaking this function into a few helper functions behind sane abstractions,
you've tamed the callback hell. In other words, this callback hell example is a
strawman - there's no excuse for a professional software engineer to write
production server code like this.

Conclusion
----------

Callbacks and callback hell get a bad rap from the NodeJS community. However,
in practice, callback hell often ends up being helpful. It's JavaScript's
built-in code reviewer that reminds you to break your code up into small,
focused, reusable modules instead of giant monolithic blobs that will make your
life miserable. It's the
[good angel on your shoulder](http://en.wikipedia.org/wiki/Shoulder_angel)
reminding you to stop ignoring I/O errors, because, yes, they do happen. Next
time, before you reach for `async.waterfall()`, take a second to think about
whether you need to refactor first.
