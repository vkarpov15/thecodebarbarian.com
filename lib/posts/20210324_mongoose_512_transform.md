[Mongoose 5.12.0](https://github.com/Automattic/mongoose/blob/master/History.md#5120--2021-03-11) was released on March 11, 2021. This new release includes a few neat new features. In this article, I'd like to highlight a particularly useful
new feature: the new `transform` option for [`populate()`](https://mongoosejs.com/docs/api/model.html#model_Model.populate). This option lets you register a function that Mongoose will call on every populated document, which gives you more fine-grained control over what the results of [`populate()`](https://mongoosejs.com/docs/populate.html) look like.

Initial Motivation: `null` if Not Found
-------------------------------------

The primary motivation for this new feature is the fact that, before Mongoose 5.12, `populate()` would always set values
to [`null`](/tutorials/fundamentals/null) if the referenced document wasn't found.

In the below example, the `child` and `children` properties both
point to an `_id` with no corresponding `Child` document. The `populate()` function replaces the `_id` with `null`.

```javascript
const Child = mongoose.model('Child', mongoose.Schema({ name: String }));
const Parent = mongoose.model('Parent', mongoose.Schema({
  child: { type: 'ObjectId', ref: 'Child' },
  children: [{ type: 'ObjectId', ref: 'Child' }]
}));

const validId = await Child.create({ name: 'Luke' }).then(doc => doc._id);
// No child with this `_id`
const invalidId = new mongoose.Types.ObjectId();

let doc = await Parent.create({
  child: invalidId,
  children: [invalidId, validId]
});

doc = await Parent.findById(doc).populate([
  'child',
  // Mongoose will filter out `null` unless you set `retainNullValues`
  { path: 'children', options: { retainNullValues: true } }
]);

doc.child; // null
doc.children; // [ null, { _id: 605b65ab78930836e101955a, name: 'Luke', __v: 0 } ]
```

The [original motivation for the `transform` option](https://github.com/Automattic/mongoose/issues/3775) was the ability to leave the unpopulated `_id` if no document was found, instead of explicitly setting the value to `null`. With that
in mind, Mongoose calls the `transform` function with 2 arguments: the populated doc, and the original id that was used
to populate this doc. Mongoose then uses the return value from the `transform` function as the populated doc. Here's
how you can tell Mongoose to leave the populated path as an ObjectId if no document was found:

```javascript
doc = await Parent.findById(doc).populate([
  {
    path: 'child',
    transform: (doc, id) => doc == null ? id : doc 
  },
  {
    path: 'children',
    options: { retainNullValues: true },
    transform: (doc, id) => doc == null ? id : doc
  }
]);

// Mongoose uses the value the `transform()` function returned
doc.child; // 605b681bee716b3b8d83b51b
doc.children; // [ 605b681bee716b3b8d83b51b, { _id: 605b65ab78930836e101955a, name: 'Luke', __v: 0 } ]
```

Flattening Objects in Populate
------------------------------

The `transform()` function can return any value: it isn't limited to just [documents](https://mongoosejs.com/docs/documents.html). For example, suppose you want `populate()` to give you an array of strings, rather than an array of documents with a string property `name`. You can use `transform()` to return the child's `name`:

```javascript
const children = await Child.create([{ name: 'Luke' }, { name: 'Leia' }]);

let doc = await Parent.create({ children });

doc = await Parent.findById(doc).populate([{
  path: 'children',
  transform: doc => doc == null ? null : doc.name
}]);

// `children` will be an array of strings rather than an array of documents
console.log(doc.children); // ["Luke","Leia"]
```

Moving On
---------

The `transform()` option gives extra fine grained control over the results of `populate()`. It's just one of the 10 new features in Mongoose 5.12. There are several other neat features, including `Query#pre()` and `Query#post()`, and a `getPopulatedDocs()` method for documents that returns an array of all populated documents on a given document. You can find the
full list on the [Mongoose changelog](https://github.com/Automattic/mongoose/blob/master/History.md#5120--2021-03-11). Make sure you upgrade to
take advantage of all the new features!

_Want to become your team's MongoDB expert? "Mastering Mongoose" distills 8 years of hard-earned lessons building Mongoose apps at scale into 153 pages. That means you can learn what you need to know to build production-ready full-stack apps with Node.js and MongoDB in a few days. <a href="https://masteringjs.io/ebooks/mastering-mongoose">Get your copy</a>!_

<a href="https://masteringjs.io/ebooks/mastering-mongoose" class="async-await-banner">
  <img src="https://masteringjs.io/ebooks/mastering-mongoose-horizontal.png">
</a>