[Mongoose 5.4](https://js.report/package/mongoose/5.4.0) was released on December 14, with 13 new features. The overarching theme for 5.4 is making [Mongoose SchemaTypes more configurable](http://thecodebarbarian.com/whats-new-in-mongoose-54-global-schematype-configuration.html), but that isn't the whole story. Mongoose 5.4 has several new features that will help you make your apps more robust and concise. In this article, I'll cover the new [`Model.events` property](https://mongoosejs.com/docs/api.html#model_Model-events) and the new [`count` option for virtual populate](https://mongoosejs.com/docs/populate.html#count).

The `count` Option for Virtual Populate
---------------------------------------

[Virtual populate](https://mongoosejs.com/docs/populate.html#populate-virtuals) is a more flexible alternative to [conventional populate](https://mongoosejs.com/docs/populate.html). Virtual populate allows you to specify [`localField` and `foreignField`](https://mongoosejs.com/docs/api.html#virtualtype_VirtualType). With Mongoose 5.4.0, you can also specify a [`count` option](https://mongoosejs.com/docs/api.html#virtualtype_VirtualType) that tells Mongoose to populate the number of documents, instead of the documents themselves. Below is an example:

```javascript
const childSchema = new Schema({ parentId: mongoose.ObjectId });

const parentSchema = new Schema({ name: String });
parentSchema.virtual('childCount', {
  ref: 'Child',
  localField: '_id',
  foreignField: 'parentId',
  count: true // Set `count: true` on the virtual
});

const Child = mongoose.model('Child', childSchema);
const Parent = mongoose.model('Parent', parentSchema);

let p = await Parent.create({ name: 'Foo' });
const c = await Child.create({ parentId: p._id });

// You can call `populate()` on `childCount` to get the number of `Child`
// docs whose `parentId` matches.
p = await Parent.findOne().populate('childCount');

console.log(p.childCount); // "1"
```

Under the hood, Mongoose uses [`countDocuments()`](https://mongoosejs.com/docs/api.html#query_Query-countDocuments) to populate your virtual if you specify `count: true`. This means better performance and less network overhead if you only need the number of documents.

Note that `childCount` is still a virtual. That means `childCount` won't show up in `JSON.stringify()` or Express' `res.json()` output unless you explicitly turn on [`virtuals: true` in your `toJSON` options](http://thecodebarbarian.com/whats-new-in-mongoose-53-orfail-and-global-toobject#global-toobject-and-tojson-options).

```javascript
console.log(JSON.stringify(p)); // Doesn't include `childCount`

console.log(JSON.stringify(p.toJSON({ virtuals: true }))); // Includes `childCount`

// Can also set `virtuals: true` globally
mongoose.set('toJSON', { virtuals: true });
console.log(JSON.stringify(p)); // Includes `childCount` because of global option
```

The `Model.events` Property
---------------------------

Tracking errors is a pain. [Mongoose error handling middleware](http://thecodebarbarian.com/mongoose-error-handling) makes it easier:

```javascript
const schema = new Schema({ test: Number });
// RegExp syntax new in Mongoose 5.3
schema.post(/.*/, function(error, res, next) {
  console.log('Error middleware:', error);
  next();
});

const Test = mongoose.model('Test', schema);

await Test.create({ test: 'foo' }); // Prints "Error middleware: ..."
await Test.findOne({ test: 'foo' }); // Also prints "Error middleware: ..."
```

However, error handling middleware comes with a few caveats. First, Mongoose doesn't have [middleware for all model functions yet](https://mongoosejs.com/docs/middleware.html). Also, Mongoose middleware can run multiple times for cases where there's a naming conflict. For example, there's middleware for both [`Document#remove()`](https://mongoosejs.com/docs/api.html#model_Model-remove) and [`Query#remove()`](https://mongoosejs.com/docs/api.html#query_Query-remove), so the below script will execute error handling middleware twice.

```javascript
const schema = new Schema({ _id: Number });
schema.post(/.*/, { document: true, query: true }, function(error, res, next) {
  console.log('Error middleware:', error.message);
  next();
});

const Test = mongoose.model('Test', schema);

const doc = new Test({ _id: void 0 });
// This double calls error handling middleware, once for `Document#remove()` and
// once for `Query#remove()`, because `Document#remove()` calls `Query#remove()`
// under the hood
await doc.remove();
```

In Mongoose 5.4.0 we added a [`Model.events`](https://mongoosejs.com/docs/api.html#model_Model-events) property. This property is a [Node.js `EventEmitter`](https://nodejs.org/api/events.html#events_class_eventemitter) that emits an 'error' event whenever any operation on that model errors. Unlike with error handling middleware, you won't get a double error using `remove()`:

```javascript
const schema = new Schema({ _id: Number });

const Test = mongoose.model('Test', schema);

// Every model has an `events` EventEmitter. You'll get an 'error' event
// every time a document or query function fails.
Test.events.on('error', err => console.log('Error event:', err.message));

const doc = new Test({ _id: void 0 });
await doc.remove(); // Prints "Error event: No _id found on document!"
```

The `Model.events` property is a supplement for error handling middleware rather than a replacement. Error handling middleware is useful for transforming errors and ensuring that user-facing errors are readable. But, depending on your architecture, `Model.events` might make it easier to ensure all errors end up in an error tracking repository like [Sentry](https://sentry.io/welcome/).

Moving On
---------

`Model.events` and `count` for virtual populate are just 2 of 13 new features in Mongoose 5.4. There's also [`Model.findOneAndReplace()`](https://mongoosejs.com/docs/api.html#model_Model.findOneAndReplace), [global SchemaType configuration](http://thecodebarbarian.com/whats-new-in-mongoose-54-global-schematype-configuration.html), and [hooks for `deleteOne()` and `deleteMany()`](https://mongoosejs.com/docs/middleware.html). Make sure you upgrade and take advantage of these new features!
