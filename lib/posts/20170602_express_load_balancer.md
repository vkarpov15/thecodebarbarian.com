*This article originally appeared on [LunchBadger](https://www.lunchbadger.com/build-load-balancer-express/). LunchBadger [helps you build APIs in a continuous lifecycle using serverless open source](https://www.lunchbadger.com/development/).*

There are plenty of powerful load balancing tools out there, like [nginx](https://nginx.org/en/) or [HAProxy](http://www.haproxy.org/). Nginx and HAProxy are fast and battle-tested, but can be hard to extend if you're not familiar with C. Nginx has support for a [limited subset of JavaScript](https://www.nginx.com/blog/launching-nginscript-and-looking-ahead/), but nginScript is not nearly as sophisticated as Node.js. If you're looking for a load balancer that you can extend with Node.js, look no further than [Express](http://npmjs.org/package/express), the most popular Node.js web framework. In this article, I'll show you how to build your own load balancer with 10 lines of Express code, and show you how you can extend this load balancer to handle profiling and [SSL termination](https://en.wikipedia.org/wiki/TLS_termination_proxy).

Building a Load Balancer
------------------------

A load balancer is a process that takes in HTTP requests and forwards these HTTP requests to one of a collection of servers. Load balancers are usually used for performance purposes: if a server needs to do a lot of work for each request, one server might not be enough, but 2 servers alternating handling incoming requests might.

First off, let's install [express](https://www.npmjs.com/package/express) and [request](https://www.npmjs.com/package/request). The request package is an HTTP client with good support for streams, using it will make writing the load balancer very easy.

```
npm install express@4.15.2 body-parser@1.17.1 request@2.81.0
```

To make things easy, let's write a single process that starts 2 Express apps, one on port 3000 and one on port 3001. The separate load balancer process should alternate between these two, sending one request to port 3000, the next request to port 3001, and the next one back to port 3000.

```javascript
const body = require('body-parser');
const express = require('express');

const app1 = express();
const app2 = express();

// Parse the request body as JSON
app1.use(body.json());
app2.use(body.json());

const handler = serverNum => (req, res) => {
  console.log(`server ${serverNum}`, req.method, req.url, req.body);
  res.send(`Hello from server ${serverNum}!`);
};

// Only handle GET and POST requests
app1.get('*', handler(1)).post('*', handler(1));
app2.get('*', handler(2)).post('*', handler(2));

app1.listen(3000);
app2.listen(3001);
```

If load balancing works properly, the console output should look like this:

```
$ node server.js
server 1 GET /test3 {}
server 2 GET /favicon.ico {}
server 1 POST /test3 { hello: 'world' }
```

The key idea for load balancing is that Node's core HTTP [IncomingMessage](https://nodejs.org/api/http.html#http_class_http_incomingmessage) and [ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse) classes, as well as [the request package's representation of HTTP requests](https://www.npmjs.com/package/request#streaming), implement [Node's streams interface](https://github.com/substack/stream-handbook). Proxying an HTTP request is as easy as calling `pipe()` twice:

```javascript
const express = require('express');
const request = require('request');

const servers = ['http://localhost:3000', 'http://localhost:3001' ];
let cur = 0;

const handler = (req, res) => {
  // Pipe the vanilla node HTTP request (a readable stream) into `request`
  // to the next server URL. Then, since `res` implements the writable stream
  // interface, you can just `pipe()` into `res`.
  req.pipe(request({ url: servers[cur] + req.url })).pipe(res);
  cur = (cur + 1) % servers.length;
};
const server = express().get('*', handler).post('*', handler);

server.listen(8080);
```

This is a quick proof of concept that doesn't support health checks or any other sophisticated load balancing features. But, if you're comfortable with Node.js, it's quite possible to build this out into a more full-fledged load balancer. For example, you might notice that the load balancer above doesn't handle errors. Let's say the underlying server takes a long time to respond:

```javascript
const handler = serverNum => (req, res) => {
  console.log(`server ${serverNum}`, req.method, req.url, req.body);
  // Wait for 10 seconds before responding
  setTimeout(() => { res.send(`Hello from server ${serverNum}!`); }, 10000);
};
```

If the underlying server shuts down in the middle of a request, the load balancer server will also crash:

```
$ node lb.js
internal/streams/legacy.js:59
      throw er; // Unhandled stream error in pipe.
      ^

Error: socket hang up
    at createHangUpError (_http_client.js:302:15)
    at Socket.socketOnEnd (_http_client.js:394:23)
    at emitNone (events.js:91:20)
    at Socket.emit (events.js:186:7)
    at endReadableNT (_stream_readable.js:974:12)
    at _combinedTickCallback (internal/process/next_tick.js:74:11)
    at process._tickCallback (internal/process/next_tick.js:98:9)
$
```

Adding an error handler to the `request` object lets you handle this error gracefully:

```javascript
const handler = (req, res) => {
  // Add an error handler for the proxied request
  const _req = request({ url: servers[cur] + req.url }).on('error', error => {
    res.status(500).send(error.message);
  });
  req.pipe(_req).pipe(res);
  cur = (cur + 1) % servers.length;
};
const server = express().get('*', handler).post('*', handler);

server.listen(8080);
```

Logging, Profiling, and SSL Termination
---------------------------------------

The major advantage of a Node.js load balancer is easy extensibility and access to the whole npm ecosystem. No need to write C or Lua or learn nginScript.

Since your load balancer is just an Express app, you can plug in [Express middleware](http://expressjs.com/en/guide/writing-middleware.html) to extend your load balancer. For example, you can write middleware that records how long each request takes using [Node.js' 'finish' event](https://nodejs.org/api/http.html#http_class_http_serverresponse).

```javascript
const profilerMiddleware = (req, res, next) => {
  const start = Date.now();
  // The 'finish' event comes from core Node.js, it means Node is done handing
  // off the response headers and body to the underlying OS.
  res.on('finish', () => {
    console.log('Completed', req.method, req.url, Date.now() - start);
  });
  next();
};

const handler = (req, res) => {
  /* ... */
};
const server = express().use(profilerMiddleware).get('*', handler).post('*', handler);
```

SSL termination is also as easy as plugging in some middleware. In this case, you can plug in [express-sslify](https://www.npmjs.com/package/express-sslify) to enforce HTTPS for all incoming requests, and use [Node.js' built-in `https` library](https://nodejs.org/api/https.html) to start an HTTPS server. Node.js' [HTTPS has some performance limitations](https://strongloop.com/strongblog/improve-the-performance-of-the-node-js-https-server/), so if your app is very performance sensitive you would need to do some tuning. For the purposes of this article, you can generate self-signed SSL certificates for `localhost` from [this site](http://www.selfsignedcertificate.com/).

```javascript
const express = require('express');
const fs = require('fs');
const https = require('https');
const request = require('request');

const servers = ['http://localhost:3000', 'http://localhost:3001' ];
let cur = 0;

const profilerMiddleware = (req, res, next) => {
  /* ... */
};

const handler = (req, res) => {
  /* ... */
};
const app = express().
  // Use `express-sslify` to make sure _all_ requests use HTTPS
  use(require('express-sslify').HTTPS()).
  use(profilerMiddleware).
  get('*', handler).
  post('*', handler);

app.listen(80);

// Start an HTTPS server with some self-signed keys
const sslOptions = {
  key: fs.readFileSync('./localhost.key'),
  cert: fs.readFileSync('./localhost.cert')
};
https.createServer(sslOptions, app).listen(443);
```

Now this rudimentary load balancer also enforces SSL for all connections and supports HTTPS, even though the underlying servers do not. Chrome still gives a loud warning that "Your connection to this site might not be private", but that's just because the SSL key and certificate are self-signed.

Moving On
---------

There are a lot of advantages to an Express-based load balancer. If your team is already familiar with Express, you can set up your own load balancer without learning how to configure a completely separate tool. Adding new functionality is easy with Express middleware and the wide variety of packages on npm. Debugging issues is easy if you're already comfortable with Express, because you're just dealing with an Express app. You can even cross-compile your load balancer into standalone executables using [pkg](http://npmjs.org/package/pkg). Next time when you're tempted to reach for nginx for load balancing, try using Express instead.
