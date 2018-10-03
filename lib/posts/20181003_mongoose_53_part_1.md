[Mongoose 5.3.0](https://github.com/Automattic/mongoose/blob/master/History.md#530--2018-09-28) was shipped on September 28. This minor release includes 17 new features and improvements that will help you clean up repetitive code. In particular, the [`orFail()` query helper](https://mongoosejs.com/docs/api.html#query_Query-orFail) and the new [`toObject` and `toJSON` global options](https://mongoosejs.com/docs/api.html#mongoose_Mongoose-set) will make life much easier for devs building [Express](http://expressjs.com/) APIs and backend services with Mongoose. In this article, I'll provide an overview of these two features and what makes them so useful.

The `orFail()` Query Helper
---------------------------

The `orFail()` query helper makes the query promise reject if no documents matched the query `conditions` (also known as the query `filter`). For example, here's how you might write an Express API endpoint that loads a user by their id:

```javascript
const decorateApp = require('@awaitjs/express');
const express = require('express');
const mongoose = require('mongoose');

const User = .model('User', new Schema({ name: String }));
const app = decorateApp(express());

app.getAsync('/user/:id', async function findById(req, res) {
  const user = await User.findById(req.params.id);
  if (user == null) {
    throw new Error('Not Found!');
  }
  return { user };
});
```

This endpoint is simple because Mongoose takes care of the subtle details. Mongoose makes sure `req.params.id` is something that can be recognized as a valid MongoDB ObjectId, and throws an error if `req.params.id` contains malformed input. Async/await catches both synchronous and asynchronous errors, so with a little help from [`@awaitjs/express`](http://npmjs.com/package/@awaitjs/express) your route handler will automatically send an HTTP response if an async error occurred. This means you can avoid the tedious exercise of writing `if (error != null)` over and over like you would in Golang.

JavaScript is all about concise code with a minimum of unnecessary repetition. The above `findById()` function has something that will get repetitive: the `if (user == null)` check. You can make it more terse by using `assert.ok(user == null)`, but unfortunately the Node.js assert library doesn't support custom errors. That's where Mongoose's new `orFail()` function comes in.

```javascript
app.getAsync('/user/:id', async function findById(req, res) {
  const user = await User.findById(req.params.id).
    orFail(new Error('Not Found'));
  res.json({ user });
});
```

This `findById()` function is equivalent, but more concise and with one less branching statement. Intuitively, it reads "find the user with this id, or fail if no user was found." Saving one `if` statement is not that exciting, but `findById().orFail()` is just the tip of the iceberg. The `orFail()` function can modify any Mongoose query operation:

* `deleteMany()`
* `deleteOne()`
* `find()`
* `findOne()`
* `findOneAndDelete()`
* `findOneAndUpdate()`
* `replaceOne()`
* `updateOne()`
* `updateMany()`

For example, suppose you want to expose an endpoint to delete a user by their id. In order to check whether the user was actually deleted, you would have to look at the [MongoDB driver docs](http://mongodb.github.io/node-mongodb-native/3.1/api/) and figure out what property to you need to check. I've been working with the MongoDB driver for years and I still forget. Then you would write out `if (res.n === 0) throw new Error('Not Found')`. Not bad, but with Mongoose you can use `orFail()`, and save yourself an `if` statement and a trip to the driver docs.

```javascript
app.delAsync('/user/:id', async function deleteById(req, res) {
  const res = await User.deleteOne({ _id: req.params.id }).
    // You can also pass a function that returns an error to `orFail()`
    orFail(() => new Error('Not Found'));
  res.json({ ok: 1 });
});
```

All in all, `orFail()` can easily save you dozens, perhaps even hundreds, of code branches. Combined with [Express error handling middleware](https://thecodebarbarian.com/80-20-guide-to-express-error-handling), you can centralize all your HTTP 404 logic in one place.

Global `toObject` and `toJSON` Options
--------------------------------------

A common Mongoose gotcha is that virtuals don't show up in `JSON.stringify()` output by default. In other words, suppose you have a user schema with a
`fullName` virtual.

```javascript
const userSchema = new Schema({ firstName: String, lastName: String });
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});
const User = mongoose.model('User', userSchema);
```

If you `res.json()` a user document, `fullName` will **not** show up by default.

```javascript
app.getAsync('/user/:id', async function findById(req, res) {
  const user = await User.findById(req.params.id).
    orFail(new Error('Not Found'));
  // `fullName` will **not** show up in the HTTP response.
  res.json({ user });
});
```

The way to tell Mongoose to include virtuals in `res.json()` is using the [`toJSON` schema option](https://mongoosejs.com/docs/guide.html#toJSON). Express' `res.json()` function calls `JSON.stringify()`, and `JSON.stringify()` calls the user document's [`toJSON()` function](https://mongoosejs.com/docs/api.html#document_Document-toJSON). The `toJSON.virtuals` schema option tells Mongoose to add virtuals to the output of `toJSON()`, and thus to your HTTP response if you're using `res.json()`.

```javascript
const userSchema = new Schema({ firstName: String, lastName: String }, {
  toJSON: {
    virtuals: true
  }
});
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});
```

Unfortunately, many developers copy/paste this `toJSON` option into every schema, which is repetitive and cumbersome. Mongoose's [global options](https://mongoosejs.com/docs/api.html#mongoose_Mongoose-set) help you configure defaults that make sense for your application. If your app relies on virtuals in HTTP responses, Mongoose 5.3 lets you declare this option globally.

```javascript
mongoose.set('toJSON', { virtuals: true });
```

Setting the global `toJSON` object means schemas will get `{ virtuals: true }` by default. You can overwrite this on the individual schema level:

```javascript
const userSchema = new Schema({ firstName: String, lastName: String }, {
  toJSON: {
     // Will overwrite global `mongoose.set('toJSON', { virtuals: true })`
    virtuals: false
  }
});
```

Or on the individual `toJSON()` call:

```javascript
res.json(user.toJSON({ virtuals: false }));
```

The `toObject` global option is analogous to the `toJSON` option, except it sets
the default options for [`Document.toObject()`](https://mongoosejs.com/docs/api.html#document_Document-toObject), not [`Document.toJSON()`](https://mongoosejs.com/docs/api.html#document_Document-toJSON). The two functions are identical, the only reason why there are two separate functions is because the `JSON.stringify()` function explicitly looks for functions called `toJSON()`.

```javascript
mongoose.set('toObject', { virtuals: true });
```

Moving On
---------

The `orFail()` query helper and global `toObject` + `toJSON` options are just two of the 17 new features in Mongoose 5.3.0. Mongoose 5.3 also adds [async iterator](http://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js) support, a [`Model.createCollection()` function](https://mongoosejs.com/docs/api.html#model_Model.createCollection) and corresponding [`autoCreate` option](https://mongoosejs.com/docs/guide.html#autoCreate), and RegExps for middleware. Make sure you upgrade to take advantage of these new features!
