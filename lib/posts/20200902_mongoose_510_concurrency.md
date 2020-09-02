[Mongoose 5.10.0](https://github.com/Automattic/mongoose/blob/master/History.md#5100--2020-08-14) was released on August 14, 2020 and introduces several important new features. Last week, I covered the new [`Connection#transaction()` helper](/whats-new-in-mongoose-5-10-improved-transactions.html) that improves Mongoose's support for [MongoDB transactions](/a-node-js-perspective-on-mongodb-4-transactions.html). This week, I'll cover another new feature: the new [`optimisticConcurrency` option for schemas](https://mongoosejs.com/docs/guide.html#optimisticConcurrency).

The Motivation for Optimistic Concurrency
-------------------------------

In Mongoose, the biggest concurrency concern is what happens when application code modifies two copies of the same document
at the same time. For example, suppose you have a `User` model with two properties: the user's approval `status`, and their
`avatar`.

```javascript
const User = mongoose.model('User', Schema({
  status: String,
  avatar: String
}));

const { _id } = await User.create({
  status: 'PENDING',
  avatar: 'http://thecodebarbarian.com/images/Barbarian_Head.png'
});
```

Because of Mongoose's change tracking, you can load two copies of the same document, modify different properties on
each copy, and save both sets of changes to the database. The below code loads two copies of a document from MongoDB, and
modifies different properties on each document. Mongoose lets both `save()` calls go through.

```javascript
// 2 copies of the same document
const doc1 = await User.findById(_id);
const doc2 = await User.findById(_id);

// Set `status` and save `doc1`
doc1.status = 'APPROVED';
await doc1.save();

// Set `avatar` and save `doc2`
doc2.status; // 'PENDING'
doc2.avatar = null;
await doc2.save();

// Both changes get stored to the database because of Mongoose change tracking
const fromDb = await User.findById(_id);
fromDb.status; // 'APPROVED'
fromDb.avatar; // null
```

In many cases, this behavior is good enough. If your `save()` calls don't conflict, then all your changes get applied.
If there is a conflict, the last `save()` wins out, and [every `save()` call is atomic](https://docs.mongodb.com/manual/core/write-operations-atomicity/#atomicity).

However, things can go wrong when you introduce validation logic that depends on multiple properties. In the above example,
you might want to ensure that a user has a valid `avatar` if their profile has `status = 'APPROVED'`. Here's how you might
implement that check:

```javascript
const userSchema = Schema({
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED']
  },
  avatar: {
    type: String,
    required: function() {
      return this.status === 'APPROVED';
    },
    validate: str => str == null || str.startsWith('https://')
  }
});

const User = mongoose.model('User', userSchema);
```

In isolation, the `User` model will ensure that a user has an `avatar` if and only if their `status` is 'APPROVED'.
But, when you have two copies of the same document, you can change the `status` on one document, change the `avatar`
on the other, and mess up your validators. Even with these custom validators, the below script succeeds and results
in an approved user in the database with a `null` avatar.

```javascript
// 2 copies of the same document
const doc1 = await User.findById(_id);
const doc2 = await User.findById(_id);

// Set `status` and save `doc1`
doc1.status = 'APPROVED';
await doc1.save();

// Set `avatar` and save `doc2`
doc2.status; // 'PENDING'
doc2.avatar = null;
await doc2.save();

// Both changes get stored to the database because of Mongoose change tracking
const fromDb = await User.findById(_id);
fromDb.status; // 'APPROVED'
fromDb.avatar; // null
```

With Optimistic Concurrency
---------------------------

The idea behind optimistic concurrency is to track the _version_ of the document and increment the version every
time you `save()`. If the version of the document in the database changed between when you loaded the document and
when you `save()`, Mongoose will throw an error.

For example, here's how you can enable `optimisticConcurrency` for `userSchema`.

```javascript
const userSchema = Schema({
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED']
  },
  avatar: {
    type: String,
    required: function() {
      return this.status === 'APPROVED';
    },
    validate: str => str == null || str.startsWith('https://')
  }
}, { optimisticConcurrency: true });
```

Given the above `userSchema`, `save()` will throw an error if there are concurrent changes to the same document.

```javascript
  // 2 copies of the same document
const doc1 = await User.findById(_id);
const doc2 = await User.findById(_id);

// Set `status` and save `doc1`
doc1.status = 'APPROVED';
await doc1.save();

// Set `avatar` and save `doc2`
doc2.status; // 'PENDING'
doc2.avatar = null;
// Throws 'VersionError: No matching document found for id "..." version 0'
await doc2.save();
```

If you try to `save()` a document that changed after you loaded it, Mongoose will throw the below error:

```
VersionError: No matching document found for id "5f4eb21361b7c9266ce51c98" version 0 modifiedPaths "avatar"
```

If you set Mongoose's debug mode using `mongoose.set('debug', true)`, you'll see that the `save()` calls end up
as `updateOne()` calls that check for document version (the `__v` key) = 0, and increment the version key if they
succeed.

```
Mongoose: users.updateOne({ _id: ObjectId("5f4eb3523d24c02767e8a267"), __v: 0 }, { '$set': { status: 'APPROVED' }, '$inc': { __v: 1 } }, { session: undefined })
Mongoose: users.updateOne({ _id: ObjectId("5f4eb3523d24c02767e8a267"), __v: 0 }, { '$set': { avatar: null }, '$inc': { __v: 1 } }, { session: undefined })
```

The first `save()` succeeds and increments the document's version to 1, and then the 2nd `save()` fails because the document
no longer has version 0.

Optimistic Concurrency versus Versioning
----------------------------------------

Optimistic concurrency is a more strict form of [Mongoose's default versioning](https://mongoosejs.com/docs/guide.html#versionKey).
Mongoose's default versioning scheme **only** checks the document's version if you [modify an array in a potentially incompatible way](http://aaronheckmann.blogspot.com/2012/06/mongoose-v3-part-1-versioning.html). Mongoose's default versioning will
never throw a `VersionError` if you do not modify any arrays.

For example, here is how you can cause a `VersionError` using Mongoose's default versioning scheme.

```javascript
  const blogPostSchema = Schema({
  comments: [Schema({ text: String }, { _id: false })]
});

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

const { _id } = await BlogPost.create({
  comments: [{ text: 'Great!' }, { text: 'Awesome!' }]
});

  // 2 copies of the same document
const doc1 = await BlogPost.findById(_id);
const doc2 = await BlogPost.findById(_id);

// Delete the 2nd comment on one copy...
doc2.comments.pull({ text: 'Awesome!' });
await doc2.save();

// And modify the 2nd comment on another copy
doc1.comments[1].text = 'Awesome';
// Throws 'VersionError: No matching document found for id "..." version 0'
await doc1.save();
```

When you turn on `optimisticConcurrency`, you override Mongoose's default versioning scheme. The `versionKey` option for
schemas is how you configure the property name that Mongoose uses to store the document version. For example, here's how
you can make Mongoose store the document version in the `version` property, rather than the default `__v`.

```javascript
const userSchema = Schema({
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'APPROVED', 'REJECTED']
  },
  avatar: {
    type: String,
    required: function() {
      return this.status === 'APPROVED';
    },
    validate: str => str == null || str.startsWith('https://')
  }
}, { optimisticConcurrency: true, versionKey: 'version' });
```

Moving On
---------

Optimistic concurrency helps validation logic that relies on multiple properties ensure it has a consistent view
of the data. If you use in-place updates and have validation logic that spans multiple properties, you should strongly
consider using optimistic concurrency. And optimistic concurrency is just one of 16 new features in Mongoose 5.10.
You can find the full list on the [Mongoose changelog](https://github.com/Automattic/mongoose/blob/master/History.md#5100--2020-08-14). Make sure you upgrade to take advantage of optimistic concurrency and all the other new features!