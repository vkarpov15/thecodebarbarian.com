[Async generator functions](/async-generator-functions-in-javascript.html) were a new feature in [ES2018](https://2ality.com/2016/10/asynchronous-iteration.html). Node.js added support for async generator
functions in [Node.js 10](https://medium.com/@nairihar/async-iteration-in-nodejs-v10-3c17dc00ed9f).
Async generator functions may seem like a pretty niche feature, but they present a neat opportunity
for [Node.js websocket](https://masteringjs.io/tutorials/node/websockets) frameworks. In this article,
I'll explain how a Node.js websocket framework might use async generator functions.

Classifying HTTP Frameworks
-----------------------

First, think about HTTP server frameworks, like [Express](https://masteringjs.io/express) or [Hapi](https://hapi.dev/). In general, most HTTP server frameworks fall into one of 3 classes:

1. **Explicit response.** To send an HTTP response in Express, you must call `res.end()`, `res.json()`, or some other function on the [`res` object](https://masteringjs.io/tutorials/express/res). In other words, you need to explicitly call a method to send a response.
2. **Implicit response using `return`.** On the other hand, [Hapi v17 explicitly removed the `reply()` function](https://auth0.com/blog/developing-restful-apis-with-hapijs/#Hapi-v17--What-s-New-). So Hapi doesn't have an equivalent to `res`: in order to send a response, you `return` a value from your request handler. Hapi then converts the `return` value into an HTTP response.
3. **Modify the response in place.** [Koa](https://koajs.com/) uses a distinct approach that's a mix of the previous two. Instead of calling functions on `res`, you modify a `ctx` object to structure your response.

In other words, some HTTP frameworks make you explicitly call a function to send the HTTP response,
some give you an HTTP response object to modify, and some just take the `return` value of a handler 
function.

The difference between websockets and HTTP is that the server can push messages onto the socket whenever
it wants, whether in response to a message or not. This means that low-level websocket frameworks like
[ws](https://www.npmjs.com/package/ws) look a lot like the "explicit response" pattern: you need to
explicitly call a function to send a message.

But could you do something more like implicit response with websockets, while still retaining the
benefit of being able to send multiple messages? That's where async generators come in.

Reading Chunks from the Server
-----------------------------

Suppose you have a [Mongoose cursor](/cursors-in-mongoose-45) that reads a bunch of documents one at a time,
and you want to send each document out over a websocket as soon as the cursor reads it. This can be
helpful if you want to minimize the amount of memory your server uses at any given time: the client gets
all the data, but the server never has to hold all the data in memory at once. For example, here's how
you might read a cursor using async/await:

```javascript
const User = mongoose.model('User', mongoose.Schema({ name: String }));

const cursor = Model.find().cursor();
for await (const doc of cursor) {
  console.log(doc.name); // Print user names 1 by 1.
}
```

What makes generators so interesting is that `yield` is like a `return`, except a function can `yield`
multiple times and pick up again where it left off. So an async generator function can do multiple
implicit responses.

```javascript
const User = mongoose.model('User', mongoose.Schema({ name: String }));

async function* streamUsers() {
  const cursor = Model.find().cursor();
  for await (const doc of cursor) {
    // Yielding each doc behaves like multiple implicit responses, if you have
    // a framework that supports it.
    yield doc;
  }
}
```

[Here's how you can build a websocket server with Node.js](https://masteringjs.io/tutorials/node/websocket-server):

```javascript
const WebSocket = require('ws');
const server = new WebSocket.Server({
  port: 8080
});

server.on('connection', function(socket) {
  socket.on('message', function(msg) {
    // Handle message
  });
});
```

So now, the trick is to glue the websocket server to the `streamUsers()` function. Assume that every
message that comes in is valid JSON, and has properties `action` and `id`. When `action === 'streamUsers'`,
you can call `streamUsers()`, and send every user out on the socket as they come out of the Mongoose cursor.

```javascript
const WebSocket = require('ws');
const server = new WebSocket.Server({
  port: 8080
});

server.on('connection', function(socket) {
  socket.on('message', function(msg) {
    msg = JSON.parse(msg);

    if (msg.action === 'streamUsers') {
      void async function() {
        // Send 1 message per user, as opposed to loading all users and then
        // sending them all in 1 message.
        for await (const doc of streamUsers()) {
          socket.send(JSON.stringify({ id: msg.id, doc }));
        }
      }().catch(err => socket.send(JSON.stringify({ id: msg.id, error: err.message })));
    }
  });
});
```

Here's how you would call `streamUsers()` via websocket client:

```javascript
const client = new WebSocket('ws://localhost:8080');

// Will print each user doc 1 at a time.
client.on('message', msg => console.log(msg));

await new Promise(resolve => client.once('open', resolve));

client.send(JSON.stringify({ action: 'streamUsers', id: 1 }));
```

Moving On
---------

Async generator functions provide an opportunity to create a higher level websocket framework based
on the implicit response pattern that HTTP frameworks like Hapi and [Fastify](https://www.fastify.io/) use.
The major benefit of the implicit response pattern is that your business logic doesn't have to be aware
of whether the framework is sending the result via websocket, HTTP polling, or something else. [Framework-free JavaScript](https://www.getrevue.co/profile/masteringjs/issues/framework-free-javascript-why-it-matters-188138) is more portable and easier to test.

The `streamUsers()` function could just as easily be reused via an HTTP framework by putting all the yielded
values into an array, or via an HTTP polling framework that lets clients make multiple requests to iterate
through a cursor. All this wouldn't be possible without [async generator functions](/async-generator-functions-in-javascript.html).