[Mongoose 4.13](https://github.com/Automattic/mongoose/blob/master/History.md#4130--2017-11-02) was released a couple weeks ago, with support for a powerful new feature: [middleware](http://mongoosejs.com/docs/middleware.html) for aggregation. The primary motivation for this feature was to enable plugins like [mongoose-explain](https://www.npmjs.com/package/mongoose-explain) to work with `aggregate()`, as well as enabling us to refactor [discriminators](http://mongoosejs.com/docs/discriminators.html) to be a plugin. Aggregation middleware is a natural complement to query middleware, it lets you apply a lot of the use cases for hooks like `pre('find')` and `post('updateOne')` to aggregation. In this article, I'll demonstrate using aggregation middleware to enforce soft deletes, and explain how aggregation middleware works with [aggregation cursors](http://mongoosejs.com/docs/api.html#aggregate_Aggregate-cursor).

Soft Deletes With Aggregation Middleware
----------------------------------------

"Soft deletes" means adding a property, like `isDeleted`, to your documents that signify whether this document is considered "deleted". This is useful if you want to delete a document from an end-user facing perspective while retaining it for future use. If you're using soft deletes, ideally clients of your API should never see soft deleted docs. From a mongoose perspective, this means deleted documents should be excluded from results by default, unless you explicitly ask for them.

Accounting for `isDeleted` in `find()` and `findOne()` is easy with query middleware:

```javascript
const userSchema = new Schema({
  name: String,
  isDeleted: {
    type: Boolean,
    required: true,
    default: false
  }
});

userSchema.pre('find', softDeleteMiddleware);
userSchema.pre('findOne', softDeleteMiddleware);

function softDeleteMiddleware(next) {
  // If `isDeleted` is not set on the query, set it to `false` so we only
  // get docs that haven't been deleted by default
  var filter = this.getQuery();
  if (filter.isDeleted == null) {
    filter.isDeleted = false;
  }
  next();
}

const User = mongoose.model('User', userSchema);
```

Before Mongoose 4.13, you couldn't do this for `aggregate()`. In 4.13.4 you can ensure that you prepend a `$match` stage to every aggregation pipeline.

```javascript
const userSchema = new Schema({
  name: String,
  isDeleted: {
    type: Boolean,
    required: true,
    default: false
  }
});

userSchema.pre('aggregate', softDeleteAggregateMiddleware);

function softDeleteAggregateMiddleware(next) {
  // Get the current aggregation pipeline and prepend a `$match` that excludes
  // all soft-deleted docs
  this.pipeline().unshift({ $match: { isDeleted: false } });
  next();
}

const User = mongoose.model('User', userSchema);
```

If you want to get fancy, you can check the aggregate object's options to conditionally prepend the `isDeleted: false` check.

```javascript
function softDeleteAggregateMiddleware(next) {
  // `options` contains options passed in, and in aggregate middleware,
  // `this` refers to the aggregation builder object:
  // http://mongoosejs.com/docs/api.html#aggregate-js
  if (this.options.ignoreSoftDelete) {
    return next();
  }
  // Get the current aggregation pipeline and prepend a `$match` that excludes
  // all soft-deleted docs
  this.pipeline().unshift({ $match: { isDeleted: false } });
  next();
}

const User = mongoose.model('User', userSchema);
const agg = User.
  aggregate().
  match({ name: { $exists: false } }).
  option({ ignoreSoftDelete: true });
agg.exec(function() {
  // Will **not** have the `isDeleted` `$match` stage, because of the
  // `ignoreSoftDelete` option that the middleware above respects.
  console.log('done', agg.pipeline());
});
```

Aggregation Middleware With Cursors
-----------------------------------

Aggregation middleware also has support for post hooks. Post hooks are useful for post-processing results, like [error handling](http://mongoosejs.com/docs/middleware.html#error-handling) or decorating the response from MongoDB. For example, suppose you wanted to add a `fetchedAt` timestamp for every document returned from your aggregation.

```javascript
const userSchema = new Schema({
  name: String
});

userSchema.post('aggregate', function(docs, next) {
  docs.forEach(doc => { doc.fetchedAt = new Date(); });
  next();
});

const User = mongoose.model('User', userSchema);

run().catch(error => console.error(error));

async function run() {
  await mongoose.connection.dropDatabase();
  await User.create({ name: 'test' });
  // Prints:
  // [ { _id: 5a0e891761006421c9a242be,
  //     name: 'test',
  //     __v: 0,
  //     fetchedAt: 2017-11-17T07:00:39.217Z } ]
  console.log(await User.aggregate([{ $match: { name: 'test' } }]));
}
```

However, mongoose also supports [cursors for aggregation](http://mongoosejs.com/docs/api.html#aggregate_Aggregate-cursor). A cursor is an object with a `next()` function that lets you iterate through
aggregation results one at a time. Because walking through a cursor is not one distinct async operation, aggregation cursors fire pre hooks but **not** post hooks. Any `post('aggregate')` you set will **not** run if you use cursors.

```javascript
const userSchema = new Schema({
  name: String
});

userSchema.pre('aggregate', function(next) {
  console.log('pre aggregate');
  next();
});

userSchema.post('aggregate', function(docs, next) {
  // This will **not** run because the below example uses a
  // cursor.
  console.log('post aggregate');
  next();
});

var User = mongoose.model('User', userSchema);

run().catch(error => console.error(error));

async function run() {
  await mongoose.connection.dropDatabase();
  await User.create([{ name: 'test' }, { name: 'test2' }]);
  const cursor = User.aggregate().match({ name: /test/ }).cursor({ useMongooseAggCursor: true }).exec();

  // Prints 'pre aggregate'

  // { _id: 5a0f25281e3ea62d9a754567, name: 'test2', __v: 0 }
  console.log(await cursor.next());
  // { _id: 5a0f25281e3ea62d9a754566, name: 'test', __v: 0 }
  console.log(await cursor.next());
  // Note that 'post aggregate' does **not** get printed
}
```

Moving On
---------

Aggregation middleware and [dynamic fields for virtual populate](http://thecodebarbarian.com/mongoose-4.13-virtual-populate-dynamic-refs-fields.html) are just two of the [10 new features in mongoose 4.13](https://github.com/Automattic/mongoose/blob/master/History.md#4130--2017-11-02). Aggregation middleware fills in a big gap in mongoose's middleware functionality, and helps you leverage your favorite query middleware patterns in conjunction with [MongoDB's powerful aggregation framework](http://thecodebarbarian.com/2014/02/14/crunching-30-years-of-nba-data-with-mongodb-aggregation). Make sure you upgrade and start writing aggregation middleware and plugins!
