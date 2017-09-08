You might remember [locking](https://en.wikipedia.org/wiki/Lock_%28computer_science%29) from your undergrad systems programming class. Locks are what you use when multiple threads want to access the same chunk of memory, and you don't want one thread to clobber the other's data. You don't have threads in Node.js, but that doesn't mean you can ignore concurrency, because your [Express server](http://expressjs.com/) might get conflicting requests at roughly the same time. In this article, I'll describe how you can leverage promises and async functions to enforce the constraint that only one instance of a given function runs at a time.

Queueing with Promise Chaining
------------------------------

Promises and chaining can let you build a queue of async functions with only a few lines of code. This is handy for enforcing that certain functions only run one at a time. [MongoDB's unique indexes](http://thecodebarbarian.com/enforcing-uniqueness-with-mongodb-partial-unique-indexes.html) are limited when it comes to enforcing more complex uniqueness constraints. For example, MongoDB's unique indexes don't allow you to say that emails should be unique unless they end with `@mycompany.com`. Queueing your registration requests is one way to work around this limitation.

Naively, you might think that calling `find()` before inserting a document would be sufficient for this use case:

```javascript
const Archetype = require('archetype');
const bodyParser = require('body-parser');
const express = require('express');
const mongodb = require('mongodb');

run().catch(error => console.error(error));

async function run() {
  const db = await mongodb.MongoClient.connect('mongodb://localhost:27017/test');
  const app = express();
  app.use(bodyParser.json());

  const UserType = new Archetype({
    email: {
      $type: 'string',
      $required: true
    }
  }).compile('UserType');

  app.post('/user', wrap(async function(req) {
    const user = new UserType(req.body);
    user.email = user.email.toLowerCase();
    // Search for existing user unless email ends with given string
    if (!user.email.endsWith('@mycompany.com')) {
      const existingUser = await db.collection('User').findOne({ email: user.email });
      if (existingUser != null) {
        throw new Error(`User already exists with email ${user.email}`);
      }
    }
    // Not necessarily safe to insert here! Race condition, two separate requests
    // might have come in at the same time
    await db.collection('User').insertOne(user);
    return { user };
  }));

  app.listen(3000);
}

function wrap(fn) {
  return function(req, res, next) {
    fn(req).then(returnVal => res.json(returnVal)).catch(err => res.status(500).json({ message: err.message }));
  };
}
```

With [curl](https://en.wikipedia.org/wiki/CURL), you'll see that the above server properly detects duplicates so long as they're sufficiently far apart.

```
$ curl -H "Content-Type: application/json" -X POST -d '{"email":"val@karpov.io"}' http://localhost:3000/user
{"user":{"email":"val@karpov.io","_id":"59b1e4c7721b1c606283d90d"}}
$ curl -H "Content-Type: application/json" -X POST -d '{"email":"val@karpov.io"}' http://localhost:3000/user
{"message":"User already exists with email val@karpov.io"}
$
```

But if you execute both curl commands in parallel using `&`, both commands successfully insert a user with the same email!

```
$ curl -H "Content-Type: application/json" -X POST -d '{"email":"val@karpov.io"}' http://localhost:3000/user & curl -H "Content-Type: application/json" -X POST -d '{"email":"val@karpov.io"}' http://localhost:3000/user
[1] 25046
{"user":{"email":"val@karpov.io","_id":"59b1e624721b1c606283d90e"}}{"user":{"email":"val@karpov.io","_id":"59b1e624721b1c606283d90f"}}[1]+  Done                    curl -H "Content-Type: application/json" -X POST -d '{"email":"val@karpov.io"}' http://localhost:3000/user
$ mongo test
MongoDB shell version v3.4.1
connecting to: mongodb://127.0.0.1:27017/test
MongoDB server version: 3.4.1
> db.User.find().pretty()
{ "_id" : ObjectId("59b1e624721b1c606283d90e"), "email" : "val@karpov.io" }
{ "_id" : ObjectId("59b1e624721b1c606283d90f"), "email" : "val@karpov.io" }
>
```

As expected, the naive approach doesn't quite work. This case is surprisingly common in practice: if a user manages to double-click on a register button, you'll get two registration requests at the same time. Distributed locking is the right approach if you have multiple processes, but you can do something much easier if you only have one process: promise chaining. In other words, have a `lastPromise` variable and chain all `register` function calls onto the `lastPromise` variable with `.then()` in the order they are received.

```javascript
app.post('/user', wrap(queue(register)));

app.listen(3000);

async function register(req) {
  const user = new UserType(req.body);
  user.email = user.email.toLowerCase();
  // Search for existing user unless email ends with given string
  if (!user.email.endsWith('@mycompany.com')) {
    const existingUser = await db.collection('User').findOne({ email: user.email });
    if (existingUser != null) {
      throw new Error(`User already exists with email ${user.email}`);
    }
  }
  // Not necessarily safe to insert here! Race condition, two separate requests
  // might have come in at the same time
  await db.collection('User').insertOne(user);
  return { user };
}

// Wrap an async function `fn()` in a queue using promise chaining, so only
// one instance of `fn()` can run at a time on this server.
function queue(fn) {
  let lastPromise = Promise.resolve();
  return function(req) {
    let returnedPromise = lastPromise.then(() => fn(req));
    // If `returnedPromise` rejected, swallow the rejection for the queue,
    // but `returnedPromise` rejections will still be visible outside the queue
    lastPromise = returnedPromise.catch(() => {});
    return returnedPromise;
  };
}
```

As long as you only run one server, this approach works. Note that I haven't looked into any potential memory leaks or performance implications, so be careful if you want to use something like this in production.

```
$ curl -H "Content-Type: application/json" -X POST -d '{"email":"val@karpov.io"}' http://localhost:3000/user & curl -H "Content-Type: application/json" -X POST -d '{"email":"val@karpov.io"}' http://localhost:3000/user
[1] 25535
{"user":{"email":"val@karpov.io","_id":"59b1e8ed899e8063a0bb0b35"}}{"message":"User already exists with email val@karpov.io"}[1]+  Done                    curl -H "Content-Type: application/json" -X POST -d '{"email":"val@karpov.io"}' http://localhost:3000/user
$ mongo test
MongoDB shell version v3.4.1
connecting to: mongodb://127.0.0.1:27017/test
MongoDB server version: 3.4.1
> db.User.find().pretty()
{ "_id" : ObjectId("59b1e8ed899e8063a0bb0b35"), "email" : "val@karpov.io" }
> ^C
bye
$
```

Queueing is one potential method for dealing with concurrency in JavaScript. Queueing plays especially nicely with [async functions](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js), because async functions return promises and promises are objects that you can pass around.

Using Mongoose
--------------

Queueing is especially powerful if you use it with a middleware tool like [mongoose](http://npmjs.org/package/mongoose) or [monogram](http://thecodebarbarian.com/introducing-monogram-the-anti-odm-for-mongodb-nodejs.html). With [mongoose middleware](http://mongoosejs.com/docs/middleware.html), you can safely make a query checking if `email` is unique every time you `save()` a document, as long as you enforce queueing.

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  }
});

userSchema.pre('save', function(next) {
  if (this.email.endsWith('@mycompany.com')) {
    return next();
  }
  // Dangerous, but works as long as you `queue()` every function that calls
  // `save()`, like `register()` below.
  User.findOne({ email: this.email }, (error, doc) => {
    if (error) {
      return next(error);
    }
    if (doc) {
      return next(new Error(`There is already a user with email ${this.email}`));
    }
    return next();
  });
});

const User = mongoose.model('User', userSchema, 'User');

app.post('/user', wrap(queue(register)));

app.listen(3000);

async function register(req) {
  const user = new User(req.body);
  await user.save();
  return { user };
}
```

You might wonder why you can't enforce queueing in mongoose middleware. That's
because, currently, there is no way to access the actual `save()` promise in mongoose middleware. You can access the document itself, but getting the promise returned by `user.save()` in the `pre('save')` middleware is not currently possible.

Using Monogram
--------------

The primary motivation for [monogram](https://www.npmjs.com/package/monogram) was a stronger middleware abstraction. Mongoose middleware is powerful, but monogram middleware allows you to do a lot of things that are either impossible or just unnatural with mongoose. For example, monogram middleware can actually change what function gets called. This is handy for soft deletes: you can change `deleteOne()` calls to `updateOne()` calls. You can also use it to convert `insertOne()` calls into a custom function that enforces queues.

```javascript
const app = express();
app.use(bodyParser.json());

const db = await monogram.connect('mongodb://localhost:27017/test');
const UserType = new Archetype({
  email: {
    $type: 'string',
    $required: true
  }
}).compile('UserType');

const User = db.collection('User');
// If the user doesn't specify the `$skipCheck` option, convert this to
// a custom `checkAndInsertOne` action.
User.pre('insertOne', action => {
  if (action.params.length >= 2 && action.params[1].$skipCheck) {
    return action;
  }
  return Object.assign(action, { name: 'checkAndInsertOne' });
});

// `checkAndInsertOne` enforces queueing using a similar paradigm to the
// `queue()` function.
let lastPromise = Promise.resolve();
User.action(async function checkAndInsertOne(doc) {
  if (doc.email.endsWith('@mycompany.com')) {
    return User.insertOne(doc, { $skipCheck: true });
  }
  // Enforce only one check runs at a time
  const returnedPromise = lastPromise.then(async function() {
    const existingUser = await User.findOne({ email: doc.email });
    if (existingUser != null) {
      throw new Error(`User already exists with email ${doc.email}`);
    }
    // If check succeeds, continue with insert
    return User.insertOne(doc, { $skipCheck: true });
  });
  lastPromise = returnedPromise.catch(() => {});
  return returnedPromise;
});

app.post('/user', wrap(async function(req) {
  const user = new UserType(req.body);
  user.email = user.email.toLowerCase();
  // `insertOne` handles email checking and queueing implicitly
  await User.insertOne(user);
  return { user };
}));
```

Moving On
---------

Because async functions return promises and promises are objects, you can build some sophisticated abstractions on top of your async functions. Using the `queue()` function from this example, you can easily convert any async function into one that enforces only one instance of this function can run at a time. If you only have one server, this can be a useful mechanism for enforcing concurrency without having to set up locking.
