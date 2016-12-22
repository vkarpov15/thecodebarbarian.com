Observables have really changed the way I think about JavaScript over
the last few months. There's been a lot of hype around use cases for
[RxJS](https://www.npmjs.com/package/rxjs), but most of them are
incomprehensible and dubiously useful. Here are the RxJS ideas that
I'm truly thankful for.

Event Emitters and Node.js Streams Suck
---------------------------------------

Since the early days of JavaScript, we had the ability to register
event handlers, like `document.on('load')`. The event emitter design
pattern is ubiquitous, but has some major limitations. The biggest
problem is that there's no way to get a stream of all events coming
from an object. For the browser `document` object this isn't a big
problem, but what about less-well-understood event emitters like a [MongoDB replica set](http://mongodb.github.io/node-mongodb-native/2.2/api/ReplSet.html)?
Each event is its own special snowflake and needs its own handler.
A casual user would need to carefully inspect the docs to figure out
which events they care about, rather than simply getting a stream of
all events and figuring out later what they want.

[Node.js readable streams](https://nodejs.org/api/stream.html#stream_readable_streams) helped with this issue by reducing an event emitter to a few distinct events with well understood semantics, like:

* 'data'
* 'end'
* 'error'

Streams made it much easier to reason about piecemeal data, but
unfortunately they aren't really used as a replacement for conventional
event emitters. The exception is the [angular2 event emitter](https://toddmotto.com/component-events-event-emitter-output-angular-2), which is basically a simpler stream. I think this is mostly
because the Node.js stream API is clunky and was aimed at being a
tool for performance (and thus only useful to 20% of developers
  20% of the time) rather than an elegant tool for structuring code.

The biggest limitation of streams, though, was filtering and transforming.
You could do things like `.filter()` and `.map()` on streams, but you
had to write a class that would extend from the `TransformStream` class.
[Transform streams are clunky and ugly](https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream), mostly because they involve creating a new class and a new object.
The API really harkens back to the good old days of Java when everything
was a class and all projects where as comically bloated as
[Enterprise Quality Fizzbuzz](https://github.com/EnterpriseQualityCoding/FizzBuzzEnterpriseEdition). Pretty soon you'll start thinking that writing a `TransformStreamAbstractFactoryProvider` class is a good idea.

<img src="https://i.imgflip.com/1erfgw.jpg" />

Observables take the streams API to its logical conclusion. Transforming
observables is neat and simple with ES6 arrow functions:

* Merge 2 observables? `o3 = Observable.merge(o1, o2)`
* Filter out certain values? `o2 = o1.filter(obj => obj.enabled)`
* Transform? `o2 = o1.map(obj => obj.name)`

What are Transformable Streams Good For?
----------------------------------------

One of my favorite use cases for observables is promise rejection
handling. Sounds crazy, I know, but bear with me. How do you usually
handle promise rejections? If you're like I was this time last year,
you do something like this:

```javascript
// One file
module.exports = function save(user) {
  return co(function*() {
    yield db.collection('User').updateOne({ _id: user._id }, {
      $set: user
    })
  });
};

// Another file
save(user).catch(handleRejection);
```

You probably have a nice `handleRejection` function that handles your
promise rejections, say by responding with an HTTP error code and
reporting an error to [sentry](https://github.com/getsentry/sentry).
The problem here is that you now have a many-to-one relationship between
promises and promise error handlers. `handleRejection()` is now in danger
of becoming a [god function](https://en.wikipedia.org/wiki/God_object)
because it'll serve as an entry point for all error handling.

Now suppose you have an observable that spits out promises.

```javascript
const result$ = new Observable(observer => {
  app.put('/user', (req, res) => {
    observer.next({ req, res, promise: save(user) });
  })
}).share();

result$.subscribe(obj => {
  obj.promise.catch(error => {
    obj.res.send('Woops, error occurred', error);
  });
});

result$.subscribe(obj => {
  obj.promise.then(res => {
    obj.res.send('Success', res);
  });
});
```

Now, there is no one function that you need to put everywhere to handle
promise rejections. As long as the promise goes into the observable,
it'll get a rejection handler. You can also filter and map your
observables, so you can easily do things like say "only errors from
these endpoints go into sentry" without needing to put extra bloat into
a central error handling function.

Conclusion
----------

Using RxJS on the server side has been the single biggest improvement
we've made to our API at [Booster](http://boosterfuels.com/) over the
last couple months. We use it with co for promise rejection handling,
we use it for slack and SMS notifications, and we're using it for more
and more every day. I think [Andre Staltz really summed it up](http://staltz.com/its-easy-to-write-imperative.html) when he described observables as making code "globally understandable."
The promise rejection handling is a great example: you have some locally
understandable code in `co`, and you have a higher-level view on top
of the `co` logic that sees a stream of promises.
By piping the results of individual business logic operations into an
observable, you have the ability to interact with a forest rather than individual trees.

_Want to learn more about co and why it forms the backbone for our business logic? Check out my ebook, [The 80/20 Guide to ES2015 Generators](http://es2015generators.com/).
It walks you through creating your own implementation of co in the first 25 pages._

<a href="http://es2015generators.com"><img src="http://i.imgur.com/iBT2ZEw.png" height="296" width="208"></a>
