Mongoose 4.5.0 is just around the corner (current ETA is [June 3](https://github.com/Automattic/mongoose/milestones)),
and it's bringing several powerful new features. If you want to get a sneak
peak,
[check out the branch on GitHub](https://github.com/Automattic/mongoose/tree/4.5) In this article, I'll highlight one feature I'm especially pumped for: the
new cursor API, or, modern streaming for mongoose.

A Brief History of Mongoose Streams
===================================

Mongoose has supported a streaming interface for queries since
[v2.4.0 in 2011](https://github.com/Automattic/mongoose/commit/2c3ae79f6b6d16ac93057f458c5172a88ec04b91). It supported streaming before
[the underlying mongodb driver did](https://github.com/mongodb/node-mongodb-native/pull/458/files). The point
of streaming is to process documents one at a time for query results that are
too big to fit into memory at once. Here's an example of how the streaming API
works in mongoose.

```javascript
const stream = Customer.find({ name: 'Axl' }).stream();

// Print every document that matches the query, one at a time
stream.on('data', doc => { console.log(doc); });
```

The bad news is that mongoose's stream code has been
[largely stagnant since 2012](https://github.com/Automattic/mongoose/commits/4.5/lib/querystream.js).
Since then, [Node.js has released 2 major overhauls of the stream API](https://strongloop.com/strongblog/whats-new-io-js-beta-streams3/),
which means that mongoose's streaming API is obsolete as well as
[formally deprecated](https://github.com/Automattic/mongoose/wiki/5.0-Deprecation-Warnings).
With 4.5.0, we're introducing a new query method, `.cursor()`, that behaves
like `.stream()`, but with a few subtle differences.

What are Cursors?
=================

In MongoDB parlance, a _cursor_ is an object that
you can use to iterate through the results of a query. If you execute a query
against a MongoDB server directly, the result is a [cursor](https://docs.mongodb.com/manual/core/cursors/) rather than a bunch
of documents. Similarly, the
[MongoDB Node.js driver will return a cursor from `find()`](http://mongodb.github.io/node-mongodb-native/2.1/api/Collection.html#find). In most cases the
cursor API is overkill, so mongoose hides it from you by default.

The most important part of the MongoDB Node.js driver's cursor API is the
[`next()` function](http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html#next), which gets the next document that matches the query. The mongoose 4.5 cursor
API wraps the underlying driver's cursor API and gives you a `next()` function
that you can use to iterate through each document:

```javascript
const cursor = Customer.find({ name: 'Axl' }).cursor();

// Print the first document. Can also use callbacks
cursor.next.then(doc => { console.log(doc); });
```

Iterating over documents one-at-a-time using `next()` is cumbersome if
you're using callbacks and promise chaining. It's doable:

```javascript
next(cursor.next);

function next(promise) {
  promise.then(doc => {
    if (doc) {
      console.log(doc);
      next(cursor.next());
    }
  })
}
```

However, if you prefer to use streams, cursors in mongoose 4.5 are [streams3-compatible streams](https://strongloop.com/strongblog/whats-new-io-js-beta-streams3/):

```javascript
cursor.on('data', function(doc) {
  console.log(doc);
});
```

New Alternatives to Streams
===========================

Streams are not necessarily the perfect way to model pulling documents
one-at-a-time from MongoDB. A readable stream is a _push-based_ concurrency
primitive: by default, it will keep spitting documents at you as fast as it
possibly can. However, MongoDB cursors are inherently _pull-based_. In other
words, to get more data from MongoDB, you have to explicitly ask the server
for more data. Mongoose cursors introduce a couple new ways to process
documents one at a time.

Since the `next()` function returns a promise, you can use [co](http://npmjs.org/package/co) to iterate through the cursor using a
`for` loop:

```javascript
co(function*() {
  const cursor = User.find({ name: 'Axl' }).populate('band').cursor();
  for (let doc = yield cursor.next(); doc != null; doc = yield cursor.next()) {
    // Print the user, with the `band` field populated
    console.log(doc);
  }
});
```

If you're not using co or a similar concurrency framework, I would highly
recommend you start doing so. Co makes complex async tasks like iterating
through a cursor as simple as writing a for loop. If you're uncomfortable
with co, check out my ebook, [_The 80/20 Guide to ES2015 Generators_](http://es2015generators.com/). It'll help you master
co by writing your own co from scratch.

If you're not using co, mongoose 4.5 cursors also have an `eachAsync()`
function akin to [RethinkDB's](https://rethinkdb.com/api/javascript/each_async/). The
point of `eachAsync()` is to make it easy to wait for an async operation
to complete before processing the next document. For example, let's say you
wanted to read documents from your mongoose collection and send them over
the network one at a time:

```javascript
cursor.on('data', function(doc) {
  superagent.post('/saveDoc', doc).exec(function() {
    console.log('Saved', doc._id);
  });
});
```

Looks simple enough, but what if your documents are huge and the network
is really slow? The stream will keep reading data from the cursor and you'll
eventually run out of memory. The ideal solution would only load the next
document once the POST request has completed. Streams have a [pause()](https://nodejs.org/api/stream.html#stream_readable_pause) method,
but it buffers internally, so you'll run out of memory anyway.
The `eachAsync()` function is the way to go:

```javascript
cursor.eachAsync(doc => superagent.post('/saveDoc', doc)).
  then(() => console.log('done!'));
```

The `eachAsync()` function takes a function `fn` that gets executed for
every document in the cursor. If `fn` returns a promise, `eachAsync()` will
wait until the promise resolves before pulling the next document from the
collection. In the above case, `fn` returns a [superagent](http://npmjs.org/package/superagent) HTTP request, which has
a `.then()` function. If `fn` returns something that isn't a promise, `eachAsync()`
will pull the next document immediately.

Conclusion
==========

The `cursor()` function is the future of streaming in mongoose. The current
`stream()` function is now formally deprecated and will be removed in 5.0.
In the majority of cases, `cursor()` is a drop-in replacement for `stream()`.
However, `cursor()` maps more naturally to how MongoDB drivers work
under the hood, and has cool new features that let you process query results
one-at-a-time.
