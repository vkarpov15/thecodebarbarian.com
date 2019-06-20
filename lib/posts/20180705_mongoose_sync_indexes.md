Mongoose released [v5.2.0](https://github.com/Automattic/mongoose/blob/master/History.md#520--2018-07-02) to support [MongoDB 4.0 and transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html) this week. In addition to transaction support, Mongoose 5.2.0
introduces several important new features. The [`syncIndexes()` function](http://mongoosejs.com/docs/api.html#syncindexes_syncIndexes)
represents Mongoose's first steps toward providing a real index management
solution, something that Mongoose historically has not done.

Motivation: Indexes in Mongoose
-------------------------------

[MongoDB indexes](https://docs.mongodb.com/manual/indexes/), like relational
database indexes, are a construct for speeding up queries. If you want to find
a document in the `User` collection where `name = 'Val'`, you would normally
have to look through every document in the `User` collection. If you have
millions of documents in the `User` collection, searching through every one can
be too slow. To avoid a full collection scan, you might store a hash map that
maps names to users with that name. At a high level, an index is a
sophisticated implementation of this sort of hash map.

Mongoose supports [2 syntaxes for declaring an index](http://mongoosejs.com/docs/api.html#schematype_SchemaType-index) on a user's name.

```javascript
const userSchema = new Schema({
  name: { type: String, index: true } // Build an index on `name`
});

// Equivalent:
const userSchema = new Schema({
  name: String
});
userSchema.index({ name: 1 });
```

In Mongoose, you declare indexes in your schemas. When you compile a [model](http://mongoosejs.com/docs/models.html) from your schema, Mongoose
will build indexes for you [in the background](https://docs.mongodb.com/manual/core/index-creation/#index-creation-background). You can use [`Model.init()`](http://mongoosejs.com/docs/api.html#init_init) to get back
a promise that fulfills when your index build is done. Under the hood, when you call [`mongoose.model()`](http://mongoosejs.com/docs/api.html#mongoose_Mongoose-model), Mongoose
calls the [`Model.ensureIndexes()` function](http://mongoosejs.com/docs/api.html#ensureindexes_ensureIndexes),
which calls the [MongoDB driver's `ensureIndex()` function](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#ensureIndex) for every index in your schema. This ensures that every index
in your schema exists in MongoDB.

However, building an index
may be very slow for collections with millions of documents, so Mongoose
supports an [`autoIndex` option](http://mongoosejs.com/docs/guide.html#autoIndex) that tells Mongoose
to not build indexes by default.

Unfortunately, there is one major gap with the above index functionality:
how do you remove or change an index? Suppose you decide you no longer need
an index on a user's `name`. You would remove the index from your schema
definition, but that would **not**
[drop the index](https://docs.mongodb.com/manual/reference/method/db.collection.dropIndex/)
from your production database. Before 5.2.0, Mongoose had no mechanism for
dropping indexes that were not defined in your schema.

```javascript
// No more `name` index, but existing databases, like your production db,
// will still have the index.
const userSchema = new Schema({
  name: String
});
```

Introducing `Model.syncIndexes()`
---------------------------------

The [`Model.syncIndexes()` function](https://mongoosejs.com/docs/api.html#model_Model.syncIndexes) ensures
that the indexes defined in your model's schema line up with the indexes
in your MongoDB collection. Here's what `syncIndexes()` does:

1. [Get all the indexes](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#indexes) defined on the collection in MongoDB.
2. For each index in MongoDB, check to see if an index with the same keys and
options is defined in your schema. If the index is not in the schema, [drop the index](http://mongodb.github.io/node-mongodb-native/3.1/api/Collection.html#dropIndexes).
3. Call `Model.ensureIndexes()` to make sure every index in the schema exists in MongoDB.

Mongoose does **not** call `syncIndexes()` for you, you're responsible for
calling `syncIndexes()` on your own. There are several reasons for this,
most notably that `syncIndexes()` doesn't do any sort of distributed locking.
If you have multiple servers that call `syncIndexes()` when they start, you
might get errors due to trying to drop an index that no longer exists.

If you have only one process that uses Mongoose and aren't concerned about
the potential performance overhead, you can do `await Model.syncIndexes()`
on server startup. For more distributed applications, you're better off
running `Model.syncIndexes()` in a separate process.

Moving On
---------

The `syncIndexes()` function is just one of [10 new features in Mongoose 5.2.0](https://github.com/Automattic/mongoose/blob/master/History.md#520--2018-07-02). We also added support for enabling [update validators](http://mongoosejs.com/docs/validation.html#update-validators) by default using
[`mongoose.set('runValidators', true)`](http://mongoosejs.com/docs/api.html#mongoose_Mongoose-set), a [`Query.prototype.set()` function](http://mongoosejs.com/docs/api.html#query_Query-set) that should make
writing [query middleware](http://mongoosejs.com/docs/middleware.html) much easier, and improved support for unique indexes with [discriminators](http://mongoosejs.com/docs/discriminators.html). Make sure you
upgrade and take advantage of all these new features!
