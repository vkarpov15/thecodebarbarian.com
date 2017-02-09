The `saveErrorIfNotFound` option and `$where` property in [mongoose 4.8](https://github.com/Automattic/mongoose/blob/master/History.md#480--2017-01-28) gives [plugins](http://thecodebarbarian.com/2015/03/06/guide-to-mongoose-plugins) a powerful new way to modify the behavior of `save()`. This feature may not seem as exciting as `eachAsync()` or the major perf improvements in 4.8, but I think it will help the community develop some handy abstractions on top of `save()`. How do these
features work? Let's say you try to save a document that was deleted after you
loaded it:

```javascript
const M = mongoose.model('Test', new Schema({
  name: String
}));

M.create({}, function(error, doc) {
  M.remove({ _id: doc._id }, function() {
    doc.name = 'test';
    doc.save(function(error, doc, numModified) {
      // What happens here? The doc was deleted before `save()` was called...
      console.log(error, doc, numModified);
    });
  });
});

// Output
null { name: 'test', __v: 0, _id: 589cd5f176f15f362784d93a } 0
```

Mongoose doesn't report an error when it can't find the document to modify. The
only indication is the third parameter to the callback, `numModified`, is 0.
There's a couple problems with this setup, including, what happens if you're
using promises? ES6 Promises can only resolve to a **single** value, so
`numModified` is undefined and there is no way for you to tell if the underlying
doc was saved or not.

```javascript
mongoose.Promise = global.Promise;

M.create({}, function(error, doc) {
  M.remove({ _id: doc._id }, function() {
    doc.name = 'test';
    doc.save().then(function(doc, numModified) {
      // numModified is undefined if you're using ES6 promises!
      console.log(doc, numModified);
    });
  });
});
```

The `saveErrorIfNotFound` Option
--------------------------------

If you set mongoose 4.8's `saveErrorIfNotFound` flag to true, you'll find that mongoose reports a `DocumentNotFoundError`:

```javascript
const M = mongoose.model('Test', new Schema({
  name: String
}, { saveErrorIfNotFound: true }));

M.create({}, function(error, doc) {
  M.remove({ _id: doc._id }, function() {
    doc.name = 'test';
    // DocumentNotFoundError: No document found for query "{ _id: 589cd7d98e9237368e1d7097 }"
    doc.save().catch(error => console.error(error));
  });
});
```

This behavior works better with promises than the default `numModified` behavior,
which was designed to work with a callback-based API. We're leaning toward setting
`saveErrorIfNotFound` to true by default in 5.0 but haven't committed to it. If
you have strong feelings one way or the other, please [put your thoughts in this GitHub issue](https://github.com/Automattic/mongoose/issues/4973).

You'll notice that the `DocumentNotFoundError` message includes the query that was used to identify the document to save. Why is that? Because the `$where` property
actually lets you change the underlying query that `save()` uses.

```javascript
M.create({}).then(doc => {
  doc.name = 'test';
  doc.$where = { prop: 'test' };
  // DocumentNotFoundError: No document found for query "{ _id: 589cda0cc9cbea37c23f4d4d, prop: 'test' }"
  doc.save().catch(error => console.error(error));
});
```

Modifying the `$where` object in conjunction with `saveErrorIfNotFound` lets you define a new class of abstractions around `save()`. Let's take a look at a few examples.

Example Uses for `$where`
-------------------------

1. Optimistic concurrency / timestamp checking
  ```javascript
  const schema = new Schema({
    name: String
  // set `createdAt` and `updatedAt` with the `timestamps` option
  }, { saveErrorIfNotFound: true, timestamps: true });

  // Before every save, add the doc's updated time to `$where`
  schema.pre('save', function(next) {
    this.$where = { updatedAt: this.updatedAt };
    next();
  });

  const M = mongoose.model('Test', schema);

  M.create({}).
    // Update the created doc and change the `updatedAt`
    then(doc => M.updateOne({ _id: doc._id }, { $set: { name: 'test2' } }).then(() => doc)).
    // Try to save the original doc
    then(doc => {
      doc.name = 'test3';
      return doc.save();
    }).
    // DocumentNotFoundError: No document found for query "{ _id: 589cdbc260f49038414cef3b, updatedAt: 2017-02-09T21:14:42.211Z }"
    catch(error => console.error(error));
  ```
2. Enforcing soft deletes
  ```javascript
  const schema = new Schema({
    name: String,
    isDeleted: Boolean
  }, { saveErrorIfNotFound: true });

  // Enforce that you can't save a doc that was "soft deleted"
  schema.pre('save', function(next) {
    this.$where = { isDeleted: { $ne: true } };
    next();
  });

  const M = mongoose.model('Test', schema);

  M.create({}).
    // Update the doc to be soft deleted in the database
    then(doc => M.updateOne({ _id: doc._id }, { $set: { isDeleted: true } }).then(() => doc)).
    then(doc => { doc.name = 'test3'; return doc.save(); }).
    // DocumentNotFoundError: No document found for query "{ _id: 589cdc62fb7963387bd79075, isDeleted: { '$ne': true } }"
    catch(error => console.error(error));
  ```
3. Versioning (alternative to timestamp checking)
  ```javascript
  const schema = new Schema({
    name: String,
    // Start at 0 and increment every time we save
    _version: { type: Number, default: 0 }
  }, { saveErrorIfNotFound: true });

  schema.pre('save', function(next) {
    // Set $where and increment
    this.$where = { _version: this._version };
    ++this._version;
    next();
  });

  const M = mongoose.model('Test', schema);

  M.create({}).
    // Load 2 copies of the same doc
    then(doc => Promise.all([
      M.findById(doc._id),
      M.findById(doc._id)
    ])).
    // Update one of them and increment their version
    then(docs => {
      docs[0].name = 'test';
      return Promise.all([
        docs[0].save(),
        docs[1]
      ]);
    }).
    // Try to update the other doc...
    then(docs => {
      docs[1].name = 'test2';
      return docs[1].save();
    }).
    // DocumentNotFoundError: No document found for query "{ _id: 589cdd6ca39d3538bd3218de, _version: 1 }"
    catch(error => console.error(error));
  ```

There's numerous other use cases for `$where`, like setting [shard keys](https://docs.mongodb.com/manual/core/sharding-shard-key/), enforcing
uniqueness with `.push()`, and checking user permissions. I'm looking forward
to seeing what other plugins you can come up with!

Moving On
---------

The `saveErrorIfNotFound` option and `$where` property are meant for use with
mongoose plugins. If you've never written a plugin before, check out [this article](http://thecodebarbarian.com/2015/03/06/guide-to-mongoose-plugins), writing plugins is simple and can save you a lot of copy/paste. There's also a [mongoose plugins search](http://plugins.mongoosejs.io/) app you can use to find plugins. This is just one of [14 new features in mongoose 4.8](https://github.com/Automattic/mongoose/blob/master/History.md#480--2017-01-28) so make sure you upgrade!
