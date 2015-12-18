In last week's article, you
[learned about bitwise query operators in MongoDB](http://thecodebarbarian.com/node-perspective-on-mongodb-3.2-bitwise-query-operators)
and how storing bitmaps in MongoDB can help you avoid using JOINs. In this
article, you'll learn about 2 new aggregation framework features in
MongoDB 3.2: the
[`$lookup`](https://docs.mongodb.org/v3.2/reference/operator/aggregation/lookup/#pipe._S_lookup)
and [`$sample`](https://docs.mongodb.org/v3.2/reference/operator/aggregation/sample/#pipe._S_sample)
operators.
You've probably heard a great deal about the `$lookup` operator, but, as
you'll see in this article, `$sample` is also an important addition.

`$lookup`
=========

The `$lookup` operator is a way for your MongoDB aggregation pipeline to
pull in documents from another collection. Note that the `$lookup` operator
is only in the aggregation framework, you **can't** use `$lookup` with CRUD
operations like `.find()`, `.findOne()`, etc.

Let's take a look at how the `$lookup` operator works in the MongoDB shell.
Suppose you have a collection of users like you see below.

```
> db.users.find().pretty()
{
	"_id" : ObjectId("56743c5af418925185babf08"),
	"name" : "Val",
	"likes" : [
		"bacon"
	]
}
```

Suppose you also have a collection of related events. Note that each event
has a `user` field, which contains the ObjectId of the associated user.

```
> db.events.find().pretty()
{
	"_id" : ObjectId("56743c87f418925185babf09"),
	"user" : ObjectId("56743c5af418925185babf08"),
	"action" : "registered",
	"time" : ISODate("2015-12-18T17:04:07.487Z")
}
{
	"_id" : ObjectId("56743c8ef418925185babf0a"),
	"user" : ObjectId("56743c5af418925185babf08"),
	"action" : "logged in",
	"time" : ISODate("2015-12-18T17:04:14.799Z")
}
```

You can use the `$lookup` operator to get the user associated with each
event. The `$lookup` operator takes an object with 4 properties:

* `from`: the collection to get documents from
* `localField`: the field in the local document
* `foreignField`: find documents in the `from` collection where this field equals the value of `localField` in the local document.
* `as`: the field in the local document to store the results in

For instance, suppose you wanted to run an aggregation on the 'events'
collection that found documents in the 'users' collection whose `_id`
field was equal to the event's `user` field. Here's how that works
in the shell.

```
> db.events.aggregate([{ $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } }]).pretty();
{
	"_id" : ObjectId("56743c87f418925185babf09"),
	"user" : [
		{
			"_id" : ObjectId("56743c5af418925185babf08"),
			"name" : "Val",
			"likes" : [
				"bacon"
			]
		}
	],
	"action" : "registered",
	"time" : ISODate("2015-12-18T17:04:07.487Z")
}
{
	"_id" : ObjectId("56743c8ef418925185babf0a"),
	"user" : [
		{
			"_id" : ObjectId("56743c5af418925185babf08"),
			"name" : "Val",
			"likes" : [
				"bacon"
			]
		}
	],
	"action" : "logged in",
	"time" : ISODate("2015-12-18T17:04:14.799Z")
}
```

One case where `$lookup` is particularly useful is for data migrations.
Suppose you realized that only storing the user's id is not terribly helpful.
You can use the
[`$out` operator](https://docs.mongodb.org/v3.2/reference/operator/aggregation/out/#pipe._S_out)
to create a new collection where each event embeds the user document.
To do this, you need a 3-stage aggregation pipeline:

* `$lookup` the user documents
* [`$unwind`](https://docs.mongodb.org/v3.2/reference/operator/aggregation/unwind/#pipe._S_unwind) so the `user` field is not an array
* `$out` to the new collection.

Below is the corresponding aggregation pipeline in the shell.

```javascript
db.events.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'user',
      foreignField: '_id',
      as: 'user'
    }
  },
  { $unwind: '$user' },
  { $out: 'new_events' }
]);
```

After you run this aggregation pipeline, the 'new_events' collection will
contain all the events with embedded user data.

```
> db.new_events.find().pretty()
{
	"_id" : ObjectId("56743c87f418925185babf09"),
	"user" : {
		"_id" : ObjectId("56743c5af418925185babf08"),
		"name" : "Val",
		"likes" : [
			"bacon"
		]
	},
	"action" : "registered",
	"time" : ISODate("2015-12-18T17:04:07.487Z")
}
{
	"_id" : ObjectId("56743c8ef418925185babf0a"),
	"user" : {
		"_id" : ObjectId("56743c5af418925185babf08"),
		"name" : "Val",
		"likes" : [
			"bacon"
		]
	},
	"action" : "logged in",
	"time" : ISODate("2015-12-18T17:04:14.799Z")
}
```

Using the `$lookup` operator in Node.js is easy. If you're going to
use the `$lookup` operator, you should use version >= 2.1.0 of the
[MongoDB driver](https://www.npmjs.com/package/mongodb) or version >= 4.3.0
of [mongoose](https://www.npmjs.com/package/mongoose). Mongoose 4.3.x also
has a handy `.lookup()` helper as part of its
[chainable aggregation pipeline builder](http://mongoosejs.com/docs/api.html#model_Model.aggregate). In
mongoose, you could run the 'new_events' migration aggregation as shown
below.

```javascript
Events.aggregate().
  lookup({
    from: 'users',
    localField: 'user',
    foreignField: '_id',
    as: 'user'
  }).
  unwind('user').
  out('new_events').
  exec();
```

`$sample`
=========

While `$lookup` is extremely popular, I'm more excited about the `$sample`
operator. The `$sample` operator is the answer to the age-old question of
[how to get a random document or documents from a MongoDB collection](http://stackoverflow.com/questions/2824157/random-record-from-mongodb).
There are numerous mechanisms for getting a single random document from
MongoDB:

* Setting a random skip value: `MyModel.find().skip(Math.random() * count);`
* Associating a random `(x, y)` coordinate pair with each document and execute a [query with a 2d index](https://docs.mongodb.org/manual/core/2d/) to find the document closest to a random point.

The first approach doesn't have great performance: you need to execute
a count query followed by a find with a skip. The second approach is
faster, but has poor randomness and uses a legacy feature. Neither approach
works well with getting multiple random documents.

The `$sample` operator makes it easy to get a random document or
documents without any additional overhead. To use `$sample`, you pass
in an object with a single property, `size`, that defines the number of
documents you want. For instance, here's how you would get a random
event from the 'new_events' collection using the `$sample` operator in
the shell.

```
> db.new_events.aggregate([{ $sample: { size: 1 } }]).pretty();
{
	"_id" : ObjectId("56743c8ef418925185babf0a"),
	"user" : {
		"_id" : ObjectId("56743c5af418925185babf08"),
		"name" : "Val",
		"likes" : [
			"bacon"
		]
	},
	"action" : "logged in",
	"time" : ISODate("2015-12-18T17:04:14.799Z")
}
> db.new_events.aggregate([{ $sample: { size: 1 } }]).pretty();
{
	"_id" : ObjectId("56743c87f418925185babf09"),
	"user" : {
		"_id" : ObjectId("56743c5af418925185babf08"),
		"name" : "Val",
		"likes" : [
			"bacon"
		]
	},
	"action" : "registered",
	"time" : ISODate("2015-12-18T17:04:07.487Z")
}
```

If the `size` you specified is larger than the number of documents in
the collection, you get all the documents back.

Like `$lookup`, you should use version >= 2.1.0 of the
[MongoDB driver](https://www.npmjs.com/package/mongodb) or version >= 4.3.0
of [mongoose](https://www.npmjs.com/package/mongoose) for `$sample`.
Mongoose >= 4.3.1 has a `.sample()` aggregation helper. Below is how
you'd run the 'new_events' sample aggregation pipeline in Mongoose.

```javascript
NewEvents.aggregate().
  sample(1).
  exec();
```

Moving On
=========

The `$lookup` and `$sample` aggregation operators are two of MongoDB
3.2's killer features. They're easy to use in Node.js, so go ahead and
try them out!
