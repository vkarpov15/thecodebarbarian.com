I must confess, I really don't like most tech books. Except for
when I got a copy of
[_Instant HTML Programmer's Reference_](http://www.amazon.com/Instant-HTML-Programmers-Reference-Html/dp/1861001568)
for Christmas when I was 10, I've never read a tech book cover-to-cover.
For my first book, [_Professional AngularJS_](http://www.amazon.com/Professional-AngularJS-Valeri-Karpov/dp/1118832078/ref=sr_1_1?s=books&ie=UTF8&qid=1454083614&sr=1-1&keywords=professional+angularjs),
my co-author and I assumed people would use the book more as a reference than
a way to go from zero to AngularJS master.
With that in mind, we designed the book as
"[_The 4 Hour Body_](http://www.amazon.com/Hour-Body-Uncommon-Incredible-Superhuman/dp/030746363X/ref=sr_1_1?s=books&ie=UTF8&qid=1454083674&sr=1-1&keywords=the+four+hour+body)
for AngularJS." Each chapter (and often sections within the chapter) is designed
to be independent of the others, so you can pick and choose which concepts
matter to you.

However, I was never quite satisfied with the "pick and choose" design. The
rationale for that decision was that first, from an early stage we were
encouraged to fill a certain page count, and second, we set out with the broad
goal of "teach everybody everything about AngularJS." These two goals were
at odds with our assumption that this book wouldn't be a page turner, and the
"pick and choose" design was the best way to reconcile the difference. However,
I thought that there had to be a better way to write an ebook.

Introducing My New Ebook
------------------------

My new ebook,
[_The 80/20 Guide to ES2015 Generators_](http://es2015generators.com/),
takes a different approach. In the spirit of the eponymous
[Pareto distribution](https://en.wikipedia.org/wiki/Pareto_distribution),
the ebook is
all about taking you from novice to expert in the minimum amount of time,
with laser focus on avoiding outside dependencies and other inconsequential
details. This ebook is focused on generators as defined in the ES2015 spec,
and does **not** attempt to teach you how to use
[babel](http://npmjs.org/package/babel),
[webpack](https://www.npmjs.com/package/webpack),
or anything else that is not absolutely necessary to use generators as
defined in the spec.
The ebook is designed to be read in 1-2 hours, and to provide you a solid
understanding of generator fundamentals by teaching you:

* How to write your own [co](https://www.npmjs.com/package/co). Co and
the notion of asynchronous coroutines enables you to write asynchronous
code without callbacks or `promise.then()`.

```javascript
const co = require('co');
const superagent = require('superagent');

co(function*() {
  const html = (yield superagent.get('http://google.com')).text;
});
```

* How to build on co to write your own [koa](https://www.npmjs.com/package/koa), AKA
"[Express](https://www.npmjs.com/package/express)' spiritual successor". In particular, you'll see how to implement
your own [koa-compose](https://www.npmjs.com/package/koa-compose), the module
that powers koa's generator-based middleware.

```javascript
const koa = require('koa');
const superagent = require('superagent');
const app = koa();

app.use(function*(next) {
  try {
    yield next;
  } catch(error) {
    this.body = error.toString();
    this.status = 500;
  }
});

app.use(function*(next) {
  // The above try/catch will catch any HTTP errors
  this.body = (yield superagent.get('http://google.com')).text;
  yield next;
});
```

* How to build your own rudimentary transpiler based on
[regenerator](https://www.npmjs.com/package/regenerator)

To be a JavaScript
developer in 2016, you need to have a solid ES2015 foundation, and to have
a solid ES2015 foundation, you need to master generators. Get the
ebook and associated code samples at
[es2015generators.com](http://es2015generators.com/) and get a head start
on the future of JavaScript.

<a href="http://es2015generators.com/">
<img src="http://i.imgur.com/iBT2ZEw.png" style="width: 250px">
</a>
