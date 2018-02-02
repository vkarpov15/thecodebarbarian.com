[Strong support for arrays](http://tgrall.github.io/blog/2015/04/21/mongodb-playing-with-arrays/) has always been one of MongoDB's killer features. For example, suppose you have a collection of blog posts where each document contains an array of comments as shown below. Before MongoDB 3.6, you could only update at most one element of the `comments` array at a time because of limitations with the [positional operator `$`](https://docs.mongodb.com/manual/reference/operator/update/positional/). Array filters in MongoDB 3.6 remove that limitation and add several more exciting features, like updating nested arrays.

```javascript
// Using the MongoDB shell
db.BlogPost.insertOne({
  title: 'A Node.js Perspective on MongoDB 3.6: Array Filters',
  comments: [
    { author: 'Foo', text: 'This is awesome!' },
    { author: 'Bar', text: 'Where are the upgrade docs?' }
  ]
});

db.BlogPost.insertOne({
  title: 'What\'s New in Mongoose 5: Improved Connections',
  comments: [
    { author: 'Bar', text: 'Thanks!' },
    { author: 'Bar', text: 'Sorry for double post' }
  ]
});
```

Positional Operator Limitations
-------------------------------

Let's say you wanted to update every comment whose `author` is 'Bar'. Before MongoDB 3.6, your only option was the below `updateMany()` operation:

```javascript
db.BlogPost.updateMany({ 'comments.author': 'Bar' }, {
  $set: { 'comments.$.author': 'Baz' }
});
```

This `updateMany()` operation _almost_ works. The updated data will look like what you see below.

```javascript
[{
	"_id" : ObjectId("5a7357c50e840a8922c62986"),
	"title" : "A Node.js Perspective on MongoDB 3.6: Array Filters",
	"comments" : [
		{
			"author" : "Foo",
			"text" : "This is awesome!"
		},
		{
			"author" : "Baz",
			"text" : "Where are the upgrade docs?"
		}
	]
},
{
	"_id" : ObjectId("5a7357c50e840a8922c62987"),
	"title" : "What's New in Mongoose 5: Improved Connections",
	"comments" : [
		{
			"author" : "Baz",
			"text" : "Thanks!"
		},
		{
			"author" : "Bar", // <-- Not updated!
			"text" : "Sorry for double post"
		}
	]
}]
```

The big problem is that the 2nd comment in the 2nd doc was not updated. That is because [the `$` operator acts as a placeholder for the **first** index in the array that matches the query](https://docs.mongodb.com/manual/reference/operator/update/positional/#update-documents-in-an-array). In other words, with `$` you can only update at most one element in an array.

Furthermore, let's say you got even more fancy and added an array of `replies` to each `comment`.

```javascript
db.BlogPost.insertOne({
  title: 'A Node.js Perspective on MongoDB 3.6: Array Filters',
  comments: [
    {
      author: 'Foo',
      text: 'This is awesome!',
      replies: [
        { author: 'Bar', text: 'Yeah I agree!' }
      ]
    },
    {
      author: 'Bar',
      text: 'Where are the upgrade docs?',
      replies: [
        { author: 'Foo', text: 'github.com/Automattic/mongoose/blob/master/migrating_to_5.md' },
        { author: 'Bar', text: 'Link does\'t work?' }
      ]
    }
  ]
});
```

Let's say you wanted to update every reply with `author` 'Bar'. Naively you might think the below `updateMany()` works, but it gives you an error message because `$` cannot handle nested arrays.

```javascript
// Does **not** work. Gives you the below error:
// "Too many positional (i.e. '$') elements found in
// path 'comments.$.replies.$.author'"
db.BlogPost.updateMany({ 'comments.replies.author': 'Bar' }, {
  $set: { 'comments.$.replies.$.author': 'Baz' }
});
```

Using Array Filters
-------------------

[Array filters](https://docs.mongodb.com/manual/reference/operator/update/positional-all/) are a new construct in MongoDB 3.6 that fix the above limitations in the positional operator. The positional operator's behavior hasn't changed in MongoDB 3.6, but array filters let you work around the above limitations of `$`.

For example, to properly update all `comments` where `author` is 'Bar', all you need to do is replace `$` with `$[]`.

```javascript
// Using the `mongo` shell
db.BlogPost.updateMany({ 'comments.author': 'Bar' }, {
  $set: { 'comments.$[].author': 'Baz' }
});
```

Here's what your documents look like after this `updateMany()`:

```javascript
[{
	"_id" : ObjectId("5a738782f169654674b114b2"),
	"title" : "A Node.js Perspective on MongoDB 3.6: Array Filters",
	"comments" : [
		{
			"author" : "Baz", // <-- Also updated. To work around this, you need array filters
			"text" : "This is awesome!"
		},
		{
			"author" : "Baz",
			"text" : "Where are the upgrade docs?"
		}
	]
},
{
	"_id" : ObjectId("5a738782f169654674b114b3"),
	"title" : "What's New in Mongoose 5: Improved Connections",
	"comments" : [
		{
			"author" : "Baz",
			"text" : "Thanks!"
		},
		{
			"author" : "Baz", // <-- Updated! `$[]` updates all docs
			"text" : "Sorry for double post"
		}
	]
}]
```

This `$[]` syntax is called the _[all positional operator](https://docs.mongodb.com/manual/reference/operator/update/positional-all/)_.
The `$[]` operator is a placeholder for every element in the array, so the above query will update every single comment in any document which has at least one comment by 'Bar'. This is close to the right answer, but not quite, because this query also updated the one comment by 'Foo'. To make this work, you need a similar operator to `$[]`, but one that's a placeholder for a elements in the array that match a given query.

The all positional operator can be thought of as a special case of the more general [filtered positional operator](https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/#up._S_[<identifier>]). This is where [`arrayFilters` comes in](https://docs.mongodb.com/manual/release-notes/3.6/#arrayfilters).

At a high level, array filters match documents in an array and provide you a name to reference the matches with the filtered positional operator. Sound confusing? Here's an equivalent update operation that updates every subdoc in `comments` whose `author` is 'Bar', but using `arrayFilters` and the filtered positional operator.

```javascript
// Using the `mongo` shell
db.BlogPost.updateMany({},
  { $set: { 'comments.$[element].author': 'Baz' } },
  // `$[element]` is tied to name `element` below
  { arrayFilters: [{ 'element.author': 'Bar' }] });
```

In the above `updateMany()`, the name `element` is a placeholder for every index in the array that matches the filter `{ 'element.author': 'Bar' }`. There is a key difference between this example and the all positional operator example: the filtered positional operator example cannot use [multi-key indexes](https://docs.mongodb.com/manual/core/index-multikey/), so the above query will always result in a [full collection scan](https://docs.mongodb.com/manual/tutorial/analyze-query-plan/#query-with-no-index). You can also specify a top-level filter to leverage indexes as shown below, but you don't necessarily have to for array filters.

```javascript
// Works as well, and can leverage multi-key indexes for the `comments.author` query
db.BlogPost.updateMany({ 'comments.author': 'Bar' },
  { $set: { 'comments.$[element].author': 'Baz' } },
  // `$[element]` is tied to name `element` below
  { arrayFilters: [{ 'element.author': 'Bar' }] });
```

So all `arrayFilters` has done in this case is make the query harder to index and harder to read. You will likely use the all positional operator more often than the filtered positional operator, but there are a couple important use cases for `arrayFilters`.

The simplest use case where you would have to use `arrayFilters` is [updating array elements with a negation operator](https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/#update-array-elements-using-a-negation-operator). The all positional operator works great for updating all comments where the `author` is 'Bar', but what about updating all comments where the `author` is **not** 'Bar'?

```javascript
// Will **not** update any documents! `{ 'comments.author': { $ne: 'Bar' } }`
// will only match documents where **none** of the comments have `author = 'Bar'`
db.BlogPost.updateMany({ 'comments.author': { $ne: 'Bar' } }, {
  $set: { 'comments.$[].author': 'Baz' }
});
```

To update all comments with `author` is not 'Bar', you need to use `arrayFilters`.

```javascript
db.BlogPost.updateMany({},
  { $set: { 'comments.$[element].author': 'Baz' } },
  // `$[element]` is tied to name `element` below
  { arrayFilters: [{ 'element.author': { $ne: 'Bar' } }] });
```

You also need `arrayFilters` to [update nested arrays](https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/#update-nested-arrays-in-conjunction-with). For example, here's how you would update every `reply` whose author is 'Bar'.

```javascript
db.BlogPost.updateMany({},
  // Go through every comment and then find every reply whose `author` is 'Bar'
  { $set: { 'comments.$[].replies.$[reply].author': 'Baz' } },
  { arrayFilters: [{ 'reply.author': 'Bar' }] });
```

Using Array Filters in Node.js
------------------------------

Using array filters with Node.js requires versions [`>= 3.0.0` of the MongoDB Node.js driver](https://www.npmjs.com/package/mongodb) or [`>= 5.0.0` of mongoose](https://www.npmjs.com/package/mongoose) in addition to [v3.6 of the MongoDB server](https://www.mongodb.com/mongodb-3.6). Earlier versions of the MongoDB (2.x) and mongoose (4.x) do **not** support array filters.

Below is a standalone script demonstrating using array filters with v3.0.2 of the MongoDB Node.js driver.

```javascript
const { MongoClient } = require('mongodb');

run().catch(error => console.error(error.stack));

async function run() {
  const client = await MongoClient.connect('mongodb://localhost:27017/test');
  const db = client.db('test');

  await db.dropDatabase();

  // Insert 2 docs
  await db.collection('BlogPost').insertOne({
    title: 'A Node.js Perspective on MongoDB 3.6: Array Filters',
    comments: [
      { author: 'Foo', text: 'This is awesome!' },
      { author: 'Bar', text: 'Where are the upgrade docs?' }
    ]
  });

  await db.collection('BlogPost').insertOne({
    title: 'What\'s New in Mongoose 5: Improved Connections',
    comments: [
      { author: 'Bar', text: 'Thanks!' },
      { author: 'Bar', text: 'Sorry for double post' }
    ]
  });

  // Update docs using `arrayFilters` and `$[]`
  await db.collection('BlogPost').updateMany({ 'comments.author': 'Bar' },
    { $set: { 'comments.$[element].author': 'Baz' } },
    // `$[element]` is tied to name `element` below
    { arrayFilters: [{ 'element.author': 'Bar' }] });

  const docs = await db.collection('BlogPost').find().toArray();
  // [ [ { author: 'Foo', text: 'This is awesome!' },
  //     { author: 'Baz', text: 'Where are the upgrade docs?' } ],
  //   [ { author: 'Baz', text: 'Thanks!' },
  //     { author: 'Baz', text: 'Sorry for double post' } ] ]
  console.log(docs.map(doc => doc.comments));
}
```

Below is an equivalent script using mongoose 5.0.3. Mongoose currently does not have any [special query helpers](http://mongoosejs.com/docs/queries.html) for MongoDB 3.6's new positional operators, please follow [this GitHub issue](https://github.com/Automattic/mongoose/issues/6082) for updates.

```javascript
const mongoose = require('mongoose');

run().catch(error => console.error(error.stack));

async function run() {
  await mongoose.connect('mongodb://localhost:27017/test');

  await mongoose.connection.dropDatabase();

  const BlogPost = mongoose.model('BlogPost', new mongoose.Schema({
    title: String,
    comments: [{ _id: false, author: String, text: String }]
  }), 'BlogPost');

  // Insert 2 docs
  await BlogPost.create({
    title: 'A Node.js Perspective on MongoDB 3.6: Array Filters',
    comments: [
      { author: 'Foo', text: 'This is awesome!' },
      { author: 'Bar', text: 'Where are the upgrade docs?' }
    ]
  });

  await BlogPost.create({
    title: 'What\'s New in Mongoose 5: Improved Connections',
    comments: [
      { author: 'Bar', text: 'Thanks!' },
      { author: 'Bar', text: 'Sorry for double post' }
    ]
  });

  // Update docs using `arrayFilters` and `$[]`
  await BlogPost.updateMany({ 'comments.author': 'Bar' },
    { $set: { 'comments.$[element].author': 'Baz' } },
    // `$[element]` is tied to name `element` below
    { arrayFilters: [{ 'element.author': 'Bar' }] });

  const docs = await BlogPost.find();
  // [ [ { author: 'Foo', text: 'This is awesome!' },
  //     { author: 'Baz', text: 'Where are the upgrade docs?' } ],
  //   [ { author: 'Baz', text: 'Thanks!' },
  //     { author: 'Baz', text: 'Sorry for double post' } ] ]
  console.log(docs.map(doc => doc.comments));
}
```

Moving On
---------

MongoDB 3.6 is [packed with exciting new features](https://docs.mongodb.com/manual/release-notes/3.6/), like [change streams](https://docs.mongodb.com/manual/release-notes/3.6/#change-streams), the [`$expr` operator](https://docs.mongodb.com/manual/release-notes/3.6/#new-query-operators), and [a bunch of new aggregation framework features](https://docs.mongodb.com/manual/release-notes/3.6/#aggregation). Array filters are one of the most exciting 3.6 features for Node.js developers, because they immediately make working with arrays in MongoDB much easier. Not only do the new positional operators lift the restriction that `$set` can only update one array element per operation, but they also make working with nested arrays much easier. [Download MongoDB 3.6](https://www.mongodb.com/download-center) today and try it yourself, just make sure you also upgrade to v3.x of the [MongoDB Node.js driver](https://www.npmjs.com/package/mongodb) or v5.x of [mongoose](https://www.npmjs.com/package/mongoose) first!
