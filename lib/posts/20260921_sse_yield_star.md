[Server-sent events (SSE)](https://thecodebarbarian.com/mongoose-studio-sse.html) are a way for HTTP servers to stream data to the client.
With a traditional HTTP request, there is only one response.
With SSE, the HTTP server can instead send intermediate responses one at a time.

In JavaScript, traditional HTTP request handlers are analogous to a standard `async function`.
SSEs are analogous to an async generator function - each `yield` streams some data to the client.

SSEs for Database Queries
-------------------------

Suppose you have the following Express route handler.
This route handler makes 2 separate MongoDB queries and returns the result when both of them complete.

```javascript
app.get('/messages', async (req, res) => {
  try {
    const [user, messages] = await Promise.all([
      User.findOne(req.query.userId).orFail(),
      Message
        .find({ userId: req.query.userId })
        .limit(3)
        .sort({ createdAt: -1 })
        .orFail()
    ]);
    res.json({ user, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

In a traditional HTTP request/response model you have to wait for all the queries to complete before sending the response.
With SSEs, however, you can get more sophisticated and send the results as soon as they are available.
The following route handler adds `then()` to each database query to send an SSE using `res.write()` when each query is completed.

```javascript
app.get('/messages', async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  try {
    const userQuery = User.findById(req.query.userId).orFail();
    const messagesQuery = Message
      .find({
        userId: req.query.userId,
        // Uncomment the following to make the query intentionally slow
        // $where: 'sleep(1000)|true'
      })
      .limit(3)
      .sort({ createdAt: -1 })
      .orFail();

    await Promise.all([
      userQuery.then(user => {
        res.write(`data: ${JSON.stringify({ user })}\n\n`)
      }),
      messagesQuery.then(messages => {
        res.write(`data: ${JSON.stringify({ messages })}\n\n`)
      })
    ]);
  } catch (err) {
    res.write(`event: server-error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
});
```

If you uncomment the `$where` in the above code, you'll see the 2nd SSE, the one containing `messages`, is sent about 5 seconds after the first SSE containing `user`.
That doesn't make the messages query any faster.
The total amount of time it takes for both queries to complete is still the same.
But it does mean the frontend doesn't have to wait for the slowest query before it can start doing useful work.
For example, if the client needs the `user` to render the user's profile picture and name, the client can render that data immediately instead of waiting for all `messages` to load.
That means faster time-to-useful-content and faster perceived load time for the user.

Tying in Async Generators
-------------------------

I don't use vanilla Express route handlers anymore because I'm a big proponent of "framework-free JavaScript" - write your business logic with no explicit dependencies on external frameworks for easier testing and improved portability.
Instead rely on a small number of globally applied conventions to glue your business logic to your external framework of choice.
So instead of writing an async function that calls `res.write()`, I prefer to write an async generator function with the understanding that any `yield` will get sent as an SSE.
[Extrovert's `toRoute()` function does just that](https://github.com/meanIT/extrovert#torouteroutehandler).

```javascript
app.get('/messages', toRoute(async function* getMessages({ userId }) {
  const user = await User.findById(userId).orFail();
  yield { user };

  const messages = await Message
    .find({ userId, $where: 'sleep(1000)|true' })
    .limit(3)
    .sort({ createdAt: -1 })
    .orFail();
  yield { messages };
}));
```

The above route handler has no explicit dependency on Express - that's what makes it framework-free.
But it does have a small problem: the database queries are executed one at a time, not in parallel.
`Promise.all()` executes the two queries in parallel, but you can't call `yield` in a callback function.
`User.findById().then(user => { yield user })` is a syntax error.

But that's where the [`yield*` operator](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield*) comes in.
Effectively, `yield*` lets one async generator function yield all the values from another generator function.
The `getMessages()` route handler with `yield*` looks like the following:

```javascript
app.get('/messages', toRoute(async function* getMessages({ userId }) {
  const userQuery = User.findById(userId).orFail();
  const messagesQuery = Message
    .find({ userId, $where: 'sleep(1000)|true' })
    .limit(3)
    .sort({ createdAt: -1 })
    .orFail();

  yield* asCompleted([
    userQuery.then(user => ({ user })),
    messagesQuery.then(messages => ({ messages }))
  ]);
}));
```

The `asCompleted()` function just needs to take in an array of promises and yield the return value of each promise as it becomes available.
The general idea for `asCompleted()` is to call [`Promise.race()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/race) in a loop.

`await Promise.race()` takes an iterable of promises and returns the value of the first promise to resolve.
So, while there are still pending promises, call `Promise.race()` to wait for the next one to resolve, yield the result, remove that promise from the pending set, and repeat.

```javascript
async function* asCompleted(promises) {
  const pending = new Set();

  for (const promise of promises) {
    let wrapped;
    // Because `Promise.race()` returns the resolved promise value,
    // not the promise itself, make the promise resolve to a value
    // that has a reference to the original promise `wrapped`.
    wrapped = Promise.resolve(promise)
      .then(value => ({ value, wrapped }));
    pending.add(wrapped);
  }

  while (pending.size > 0) {
    // `wrapped` is the promise value, so we can delete it from the set.
    const { value, wrapped } = await Promise.race(pending);
    pending.delete(wrapped);
    yield value;
  }
}
```

`asCompleted()` is useful beyond SSEs because it provides a different way to iterate over a set of asynchronous operations.
`Promise.all()` gives you a promise that waits for all the promises to complete and gives you the results as an array in the original order - `Promise.all([A, B, C])` always gives you an array in the same order as the input.

`asCompleted()` instead gives you an async iterable over the promises in the order they are completed - a meaningfully different abstraction.
Sometimes you don't care about the original order of `A, B, C`, just which order they complete.
For example, suppose you have some `processFile()` function that does some async processing on a bunch of files.
`asCompleted()` gives you a neat way to loop over the `processFile()` tasks in the order they're completed.

```javascript
const jobs = files.map(file => processFile(file));

for await (const result of asCompleted(jobs)) {
  console.log('Finished:', result.filename);
}
```

Moving On
---------

`Promise.all()` is great when you need all your data before you can do anything with it.
But that's not always the case, especially with SSEs.
With SSEs, you can send query results as soon as they are ready - no need for the client to spin waiting for a slow query when some results are already available.

The tricky part with async generators is that you can't yield from inside a `then()` callback.
The neat `yield*` operator plus a small `asCompleted()` async generator fills that gap nicely:

```javascript
yield* asCompleted([
  getUser().then(user => ({ user })),
  getMessages().then(messages => ({ messages })),
  getNotifications().then(notifications => ({ notifications }))
]);
```

So all 3 operations start in parallel, and whichever one finishes first gets yielded first.
That means SSEs can send data immediately as it becomes available.
