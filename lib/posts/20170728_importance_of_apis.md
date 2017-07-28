*This article originally appeared on [LunchBadger](https://www.lunchbadger.com/go-full-stack-with-express-and-apis/). LunchBadger [helps you build APIs in a continuous lifecycle using serverless open source](https://www.lunchbadger.com/development/).*

Around 2011-2014, the notion of a full stack JavaScript developer became mainstream. The idea was that, as browsers became more standardized, hybrid native app frameworks like Cordova grew in sophistication, and Node.js continued to grow in popularity, we would all be working on independent small JavaScript projects that each had their own client, server, and database. However, increasing fragmentation in the client-side JavaScript space, the continued superiority of native mobile apps over hybrid mobile apps, and the power of specialization has drastically slowed the rise of full stack JavaScript.

Now that the promise of a single unified client is no longer an imminent possibility, APIs, REST and otherwise, are more pivotal than ever for unifying disparate clients. Node.js' powerful concurrency model along with the prolific npm and [Express](https://www.npmjs.com/package/express) ecosystems make Express the ideal tool to build your next API.

Shouldn't We All Just Be Using Firebase?
----------------------------------------

There was a time when I thought AngularFire meant the end of backend development. Firebase's client library maintained a socket connection to a realtime database, and, best of all, AngularFire integrated with Angular 1's dirty checking to sync your changes in JavaScript to the realtime database with no work on your part. All you did was write some HTML and you're done. Add in over-the-air updates with Ionic 1 and you had a mobile app too.

```javascript
app.controller('MyController', function($scope, $firebaseObject) {
  var ref = firebase.database().ref();
  $scope.data = $firebaseObject(ref);
});
```

```html
<div controller="MyController">
  <h1>{{data.title}}</h1>
</div>
```

Unfortunately, it also became clear that Angular 1 was difficult to optimize and extend beyond building simple forms. Cordova's proving to have similar issues. Sophisticated clients require developers to specialize.

With the assumption that you need disparate clients, like an iOS app, an Android app, an Electron desktop app, and a web client, you need a centralized logic layer. If you use a realtime database directly and your Android app's logic doesn't keep up with your iOS app's logic, you've got a problem. That's where APIs come in.

What Should APIs Do?
--------------------

I think KeenIO summed it up best when they said APIs ["boil complex processes down to simple commands that magically do lots of work for you."](https://blog.keen.io/the-api-era-f004f6800488) Or, like [Browserling put it](https://twitter.com/browserling/status/866694093929316352), an API is like a Kraken that lurks under the surface of your apps and ties together logic and data sources so your apps don't have to. Here's a few examples of tasks that APIs should take care of for their clients.

<img src="https://pbs.twimg.com/media/DAcdpz-WsAIczvd.jpg">

* Security

Clients are wildly insecure, as I was recently reminded when I booked a blocked-off slot for car maintenance because the dealer's site relied on Angular 1 form validation. They didn't verify the slot was available on their server. [Express middleware](http://expressjs.com/en/guide/writing-middleware.html) makes it easy to define security rules for a group of routes without repeating yourself. For example, the [express-jwt](https://www.npmjs.com/package/express-jwt) library makes it easy to set up [JSON Web Token](https://jwt.io/) authentication. You can write additional middleware to define your own custom rules.

```javascript
const app = require('express')();
const bodyParser = require('body-parser');

const jwt = require('express-jwt')({ secret: 'my secret key' });

// Now all HTTP endpoints that start with `/admin` and `/user`
// require JWT authentication
app.use('/admin', jwt);
app.use('/user', jwt);

// Add an additional layer of security to `/admin` endpoints to
// make sure only admin users reach it
app.use('/admin', function (req, res, next) {
  // `express-jwt` sets `req.user` for you. Conceptually, jwt's
  // encrypt the JSON representation of the user using the secret key.
  // In other words, your access token for the API is your encrypted
  // user data!
  if (!req.user.isAdmin) {
    return res.status(401).json({ err: 'Must be admin!' });
  }
  return next();
});
```

* Concurrency and Locking

I'm sure you've heard that Node.js is non-blocking and there's no standard Node.js notion of a "lock", as opposed to languages like [Java](https://docs.oracle.com/javase/7/docs/api/java/util/concurrent/locks/Lock.html?is-external=true). However, these days APIs are typically scaled horizontally, either across multiple instances of an API server or across numerous microservices. When you have multiple servers on different machines, the standard in-memory locks you might remember from undergrad systems programming are not very useful. You need [distributed locking](https://redis.io/topics/distlock), and managing distributed locking across different clients is a nightmare.

Express middleware makes it easy to lock a resource for a certain group of endpoints. A common example is locking a user every time the client hits an endpoint that updates a user. You might have separate endpoints like `updateAdmin` for doing special types of updates, so in general you'd like to
lock the user every time someone hits a `PUT` endpoint under `/user`. Here's an example using MongoDB as the store for the distributed lock.

```javascript
const { MongoClient } = require('mongodb');
const app = require('express')();
const bodyParser = require('body-parser');

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017/test');

  app.put('/user/:id/*', async function(req, res, next) {
    // If we successfully upserted, that means we acquired the lock. Otherwise,
    // means the resource is already locked
    const result = await db.collection('Lock').findOneAndUpdate(
      { resource: 'User', id: req.params.id },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true, returnOriginal: false });

    if (!result.lastErrorObject.updatedExisting) {
      // Acquired the lock!

      res.on('finish', () => {
        // Release the lock by deleting the lock document when the request
        // handler is done
        db.collection('Lock').deleteOne({ _id: result.value._id });
      });
      return next();
    }

    res.status(409).json({ error: `Resource ${req.params.id} locked` });
  });

  app.put('/user/:id/updateAdmin', function(req, res) {
    res.json({ ok: 1 });
  });

  app.put('/user/:id/update', function(req, res) {
    res.json({ ok: 1 });
  });

  app.listen(3000);
}

run().catch(error => console.error(error.stack));
```

* Data Validation

Data formats change fast, and apps can't keep up unless you force upgrade your users regularly. Thankfully, because JavaScript is a dynamically typed language, the JavaScript community has a myriad of well-adopted type casting and data validation libraries, including [mongoose](http://npmjs.org/package/mongoose), [joi](https://www.npmjs.com/package/joi), [ajv](https://www.npmjs.com/package/ajv), and others.  [Express error handling middleware](http://expressjs.com/en/guide/error-handling.html) enables you to handle data validation errors in a standard way across your application.

```javascript
const Joi = require('joi');
const { MongoClient } = require('mongodb');
const app = require('express')();
const bodyParser = require('body-parser');

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017/test');
  // `schema` lets you validate that objects match the given schema
  const schema = Joi.object().keys({
    email: Joi.string().required().regex(/^.+@.+\..+$/),
    name: Joi.string().required()
  });

  // Express body parser
  app.use(bodyParser.json());
  // Sample endpoint that inserts a user in the database if it is valid
  app.post('/user', async function(req, res, next) {
    const result = schema.validate(req.body);
    if (result.error) {
      return next(result.error);
    }
    await db.collection('User').insertOne(req.body);
    return { user: req.body };
  });
  // Express error handling middleware. Will execute if an error was passed to
  // `next()`. When you add more endpoints, they will still have the same
  // way of reporting errors.
  app.use(async function(err, req, res, next) {
    if (err.isJoi) {
      return res.status(400).json({ err: err.message, details: err.details });
    }
    next(err);
  });
  // Catch-all error handler
  app.use(function(err, req, res, next) {
    return res.status(500).json({ err: err.message });
  });

  app.listen(3000);
}

run().catch(error => console.error(error.stack));
```

* Interfacing With Externally Facing APIs

For both security and maintainability, APIs should be responsible for most interactions between your software and external APIs. Leveraging external APIs is difficult and error prone, having a centralized layer for communicating with external APIs and reporting errors is critical. Keeping potentially sensitive API keys out of the hands of insecure clients is also important.

Express error handling middleware makes it easy to handle errors from external APIs in a standardized way, so long as the errors are reported through `next()`. Here's an example of error handling middleware for the Twilio API.

```javascript
const Twilio = require('twilio');
const app = require('express')();

const twilio = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function run() {
  app.post('/sms', async function(req, res, next) {
    try {
      await twilio.messages.create({
        body: 'Hello',
        // From number is invalid, this will cause an error
        from: '+12015550123',
        to: '+5555555555'
      });
    } catch (error) {
      // Mark this error as a Twilio error, because the Twilio API doesn't
      // have a canonical error class
      error.isTwilio = true;
      return next(error);
    }
    res.json({ ok: 1 });
  });

  // Express error handler for handling twilio errors
  app.use(function(err, req, res, next) {
    if (err.isTwilio) {
      // Handle Twilio errors from all endpoints
      return res.status(err.status).json({ err: `Twilio error: ${err.message}` });
    }
    next(err);
  });

  // Catch-all error handler
  app.use(function(err, req, res, next) {
    return res.status(500).json({ err: err.message });
  });

  app.listen(3000);
}

run().catch(error => console.error(error.stack));
```

Moving On
---------

Because clients are becoming increasingly specialized, APIs are becoming increasingly important for providing consistency across wildly different clients. The 2013 dream of a single unified JavaScript client for mobile, browser, and desktop is infeasible for most companies. But, because of the prolific npm ecosystem, Node.js' elegant concurrency model, and code sharing with browser, [Electron](https://electron.atom.io/), and [React Native](https://facebook.github.io/react-native/), a Node.js API written in Express is still the way to go.
