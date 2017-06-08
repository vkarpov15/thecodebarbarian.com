[Mongoose setters](http://mongoosejs.com/docs/schematypes.html) have always had the limitation that they only work for `save()`, *not* for queries. For example, let's say you have a schema that enforces your emails are always lowercase:

```javascript
const schema = Schema({
  email: {
    type: String,
    // Custom setter that always calls `toLowerCase()`
    lowercase: true
  }
});

const PersonModel = mongoose.model('Person', schema);
```

Creating and saving an instance of `PersonModel` will ensure that `email` is converted to lowercase before saving.

```javascript
const val = new PersonModel({ email: 'Val@test.com' });
console.log(val.email); // "val@test.com"
val.save(function(error, val) {
  console.log(val.email); // "val@test.com"
});
```

In general, any time you create a mongoose document, you'll get a lowercased email. Because `insertMany()` and `create()` use mongoose documents, they'll lowercase emails as well. However, mongoose 4.x will *not* lowercase email with `find()`, `findOneAndUpdate()`, or any other query options.

```javascript
// Will *not* lowercase email for query, so should return no results
PersonModel.find({ email: 'Val@test.com' });
// Will save uppercase email!
PersonModel.findOneAndUpdate({}, { email: 'Val@test.com' }, { upsert: true });
```

The `runSettersOnQuery` Option
------------------------------

Mongoose 4.10 has an opt-in option on the schema level that will run setters for queries.

```javascript
const schema = Schema({
  email: {
    type: String,
    lowercase: true
  }
}, { runSettersOnQuery: true }); // Opt-in to running setters for queries

// Equivalent to `find({ email: 'val@test.com' })` with `runSettersOnQuery`
PersonModel.find({ email: 'Val@test.com' });
// Equivalent to `{ email: 'val@test.com' }` with `runSettersOnQuery`
PersonModel.findOneAndUpdate({}, { email: 'Val@test.com' }, { upsert: true });
```

Mongoose will also run any custom setters you may have. For example, let's say you have a setter that ensures that the `num` property is an integer:

```javascript
const schema = Schema({
  num: {
    type: String,
    set: v => Math.floor(v)
  }
}, { runSettersOnQuery: true });

// Equivalent to `find({ num: 3 })`
NumModel.find({ num: 3.14 });
// Equivalent to `{ num: 2 }`
NumModel.findOneAndUpdate({}, { num: 2.718 }, { upsert: true });
```

Setter Context
--------------

Like [running validation on `update()`](http://mongoosejs.com/docs/validation.html#update-validators), the reason why mongoose does not run setters on queries by default because of [function context](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this). If you create a new document, setters can access the document using `this`:

```javascript
'use strict';

const schema = Schema({
  num: {
    type: String,
    set: function(v) {
      console.log(this);
      return v;
    }
  }
}, { runSettersOnQuery: true });
const NumModel = mongoose.model('Num', schema);

// Prints a document, "{ _id: ... }"
new NumModel({ num: 3 });
// Prints "null" (unless you're not in strict mode)
NumModel.find({ num: 3 });
```

For built-in mongoose setters (`lowercase`, `uppercase`, `trim`) this is a non-issue. However, community plugins often rely on setter context, so we're not turning this on by default in 4.x. We're planning on [turning it on by default in 5.0](https://github.com/Automattic/mongoose/issues/5340), so if you have concerns, please voice them on [this GitHub issue](https://github.com/Automattic/mongoose/issues/5340).

Moving On
---------

[Mongoose 4.10](https://github.com/Automattic/mongoose/blob/master/History.md#4100--2017-05-18) has 8 powerful new features and several small bug fixes, including aliasing and [unique in arrays](http://thecodebarbarian.com/whats-new-in-mongoose-4.10-unique-in-arrays.html). Make sure you upgrade to take advantage of these powerful new features!
