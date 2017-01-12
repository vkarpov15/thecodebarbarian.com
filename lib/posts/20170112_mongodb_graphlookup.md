[The newly released MongoDB 3.4](https://docs.mongodb.com/manual/release-notes/3.4/)
is filled with powerful new features. In particular, there are [27 new aggregation concepts](https://docs.mongodb.com/manual/release-notes/3.4/#aggregation), the most
exciting of which are `$graphLookup` and `$facet`. In this article, I'll show how
`$graphLookup` works and how you can use it in Node.js.

What Does `$graphLookup` Do?
----------------------------

`$graphLookup` is a new [aggregation framework stage](https://docs.mongodb.com/manual/reference/operator/aggregation-pipeline/) that recursively searches through a collection. For a concrete example, let's insert
5 documents into the `customers` collection:

```javascript
db.customers.insertMany([
  { _id: 1, name: 'Luke Skywalker', friends: [2, 3] },
  { _id: 2, name: 'Han Solo', friends: [1, 3, 4] },
  { _id: 3, name: 'Leia Organa', friends: [1, 3] },
  { _id: 4, name: 'Lando Calrissian', friends: [2, 5] },
  { _id: 5, name: 'Tendra Risant', friends: [4] }
]);
```

Luke Skywalker has 2 friends, Han Solo and Leia Organa. But how do you determine
who Luke's 2nd degree connections (friends of friends) are? That's where
`$graphLookup` comes in:

```javascript
db.customers.aggregate([
  { $match: { _id: 1 } }, // Only look at Luke Skywalker
  {
    $graphLookup: {
      from: 'customers', // Use the customers collection
      startWith: '$friends', // Start looking at the document's `friends` property
      connectFromField: 'friends', // A link in the graph is represented by the friends property...
      connectToField: '_id', // ... pointing to another customer's _id property
      maxDepth: 1, // Only recurse one level deep
      as: 'connections' // Store this in the `connections` property
    }
  }
]);
```

The result of this aggregation looks like this:

```javascript
{
	"_id" : 1,
	"name" : "Luke Skywalker",
	"friends" : [
		2,
		3
	],
	"connections" : [
		{
			"_id" : 4,
			"name" : "Lando Calrissian",
			"friends" : [
				2,
				5
			]
		},
		{
			"_id" : 1,
			"name" : "Luke Skywalker",
			"friends" : [
				2,
				3
			]
		},
		{
			"_id" : 3,
			"name" : "Leia Organa",
			"friends" : [
				1,
				3
			]
		},
		{
			"_id" : 2,
			"name" : "Han Solo",
			"friends" : [
				1,
				3,
				4
			]
		}
	]
}
```

Because of `maxDepth`, `$graphLookup` will only explore up to one level deep,
which corresponds to friends and friends of friends. If you remove `maxDepth`,
`$graphLookup` will recursively go through the whole graph.

```javascript
db.customers.aggregate([
  { $match: { _id: 1 } }, // Only look at Luke Skywalker
  {
    $graphLookup: {
      from: 'customers',
      startWith: '$friends',
      connectFromField: 'friends', // <-- skip `maxDepth`
      connectToField: '_id',
      as: 'connections'
    }
  },
  { $project: { 'connections.name': 1 } }
]);

// Output

{
	"_id" : 1,
	"connections" : [
		{
			"name" : "Tendra Risant"
		},
		{
			"name" : "Han Solo"
		},
		{
			"name" : "Leia Organa"
		},
		{
			"name" : "Luke Skywalker"
		},
		{
			"name" : "Lando Calrissian"
		}
	]
}
```

`$graphLookup` and Bacon Numbers
--------------------------------

`$graphLookup` can also search a separate collection. Let's use this to compute
the [Arnold number](https://en.wikipedia.org/wiki/Six_Degrees_of_Kevin_Bacon)
for a small data set of actors and movies.

```javascript
db.actors.insertMany([
  { _id: 1, name: 'Arnold Schwarzenegger' },
  { _id: 2, name: 'James Earl Jones' },
  { _id: 3, name: 'Harrison Ford' },
  { _id: 4, name: 'Tommy Lee Jones' }
]);
db.movies.insertMany([
  { _id: 1, name: 'Conan the Barbarian', actors: [1, 2] },
  { _id: 2, name: 'The Empire Strikes Back', actors: [2, 3] },
  { _id: 3, name: 'The Fugitive', actors: [3, 4] }
]);
```

Getting the Arnold number for actors is somewhat tricky, but you can compute
the Arnold number for _movies_ using `$graphLookup` using the
[`depthField` option for `$graphLookup`](https://docs.mongodb.com/manual/reference/operator/aggregation/graphLookup/#pipe._S_graphLookup).

```javascript
db.data.aggregate([
  { $match: { _id: 1 } }, // Only look at Arnold Schwarzenegger
  {
    $graphLookup: {
      from: 'movies', // Explore the movies collection
      startWith: '$_id', // Start with movies that contain Arnold's _id
      connectFromField: 'actors', // Match actors in one movie...
      connectToField: 'actors', // to actors in another movie
      as: 'connections',
      // Add a 'steps' property to each connections subdoc that contains
      // the number of steps needed to get to this movie
      depthField: 'steps'
    }
  }
]);

// Output

{
	"_id" : 1,
	"name" : "Arnold Schwarzenegger",
	"connections" : [
		{
			"_id" : 3,
			"name" : "The Fugitive",
			"actors" : [
				3,
				4
			],
			"steps" : NumberLong(2) // 2 steps to get here, Conan -> Empire -> Fugitive
		},
		{
			"_id" : 2,
			"name" : "The Empire Strikes Back",
			"actors" : [
				2,
				3
			],
			"steps" : NumberLong(1) // Needed 1 step to get here, Conan -> Empire
		},
		{
			"_id" : 1,
			"name" : "Conan the Barbarian",
			"actors" : [
				1,
				2
			],
			"steps" : NumberLong(0) // Started here
		}
	]
}
```

With a little [`$unwind`](https://docs.mongodb.com/manual/reference/operator/aggregation/unwind/) and [`$group`](https://docs.mongodb.com/manual/reference/operator/aggregation/group/) magic, you can sort actors by the Arnold number for the movies they're in and
take the closest one:

```javascript
db.actors.aggregate([
  { $match: { _id: 1 } }, // Only look at Arnold Schwarzenegger
  {
    $graphLookup: {
      from: 'movies', // Explore the movies collection
      startWith: '$_id', // Start with movies that contain Arnold's _id
      connectFromField: 'actors', // Match actors in one movie...
      connectToField: 'actors', // to actors in another movie
      as: 'connections',
      // Add a 'steps' property to each connections subdoc that contains
      // the number of steps needed to get to this movie
      depthField: 'steps'
    }
  },
  // Generate 1 doc for each element in the connections array
  { $unwind: '$connections' },
  // Generate 1 doc for each element in an actors array
  { $unwind: '$connections.actors' },
  // Now we have 1 doc for each movie/actor pair, so order by Arnold number
  { $sort: { 'connections.steps': 1 } },
  // Skip Arnold
  { $match: { 'connections.actors': { $ne: 1 } } },
  // And pick the doc with the smallest Arnold number for each Actor
  {
    $group: {
      _id: '$connections.actors',
      arnoldNumber: { $first: { $add: ['$connections.steps', 1] } }
    }
  }
]);

// Output

// Tommy Lee Jones -> Harrison Ford (The Fugitive) ->
// James Earl Jones (The Empire Strikes Back) -> Arnold (Conan the Barbarian)
{ "_id" : 4, "arnoldNumber" : 3 } // Tommy Lee Jones
{ "_id" : 3, "arnoldNumber" : 2 } // Harrison Ford
{ "_id" : 2, "arnoldNumber" : 1 } // James Earl Jones
```

So `$graphLookup` doesn't get you the right Arnold number on its own. But,
thanks to the fact that MongoDB aggregations are pipelines, you can massage
the data with a few extra stages to get the correct Arnold number.

Using `$graphLookup` in Node.js
-------------------------------

There are no version restrictions for using `$graphLookup` with the MongoDB
Node.js driver or mongoose. The below scripts work fine back to MongoDB driver
2.1.0 and mongoose 4.5.0.

```javascript
const mongodb = require('mongodb');

mongodb.MongoClient.connect('mongodb://localhost:27017/test').
  then(db => db.collection('actors').aggregate([
    { $match: { _id: 1 } }, // Only look at Arnold Schwarzenegger
    {
      $graphLookup: {
        from: 'movies', // Explore the movies collection
        startWith: '$_id', // Start with movies that contain Arnold's _id
        connectFromField: 'actors', // Match actors in one movie...
        connectToField: 'actors', // to actors in another movie
        as: 'connections',
        // Add a 'steps' property to each connections subdoc that contains
        // the number of steps needed to get to this movie
        depthField: 'steps'
      }
    },
    // Generate 1 doc for each element in the connections array
    { $unwind: '$connections' },
    // Generate 1 doc for each element in an actors array
    { $unwind: '$connections.actors' },
    // Now we have 1 doc for each movie/actor pair, so order by Arnold number
    { $sort: { 'connections.steps': 1 } },
    // Skip Arnold
    { $match: { 'connections.actors': { $ne: 1 } } },
    // And pick the doc with the smallest Arnold number for each Actor
    {
      $group: {
        _id: '$connections.actors',
        arnoldNumber: { $first: { $add: ['$connections.steps', 1] } }
      }
    }
  ]).toArray()).
  then(res => console.log(res)).
  catch(error => console.error('error', error));
```

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/test');

var Actor = mongoose.model('Actor', new mongoose.Schema());

Actor.aggregate([
  { $match: { _id: 1 } }, // Only look at Arnold Schwarzenegger
  {
    $graphLookup: {
      from: 'movies', // Explore the movies collection
      startWith: '$_id', // Start with movies that contain Arnold's _id
      connectFromField: 'actors', // Match actors in one movie...
      connectToField: 'actors', // to actors in another movie
      as: 'connections',
      // Add a 'steps' property to each connections subdoc that contains
      // the number of steps needed to get to this movie
      depthField: 'steps'
    }
  },
  // Generate 1 doc for each element in the connections array
  { $unwind: '$connections' },
  // Generate 1 doc for each element in an actors array
  { $unwind: '$connections.actors' },
  // Now we have 1 doc for each movie/actor pair, so order by Arnold number
  { $sort: { 'connections.steps': 1 } },
  // Skip Arnold
  { $match: { 'connections.actors': { $ne: 1 } } },
  // And pick the doc with the smallest Arnold number for each Actor
  {
    $group: {
      _id: '$connections.actors',
      arnoldNumber: { $first: { $add: ['$connections.steps', 1] } }
    }
  }
]).
then(res => console.log(res)).
catch(error => console.error('error', error));
```

However, I'd recommend using MongoDB driver >= 2.2.19 and Mongoose >= 4.7.6
for full support for MongoDB 3.4. Mongoose 4.8.0 will also include a [`graphLookup()` helper function for its chainable aggregation pipeline builder](https://github.com/Automattic/mongoose/issues/4819):

```javascript
const promise = Actor.aggregate().
  match({ _id: 1 }).
  graphLookup({
    from: 'movies', // Explore the movies collection
    startWith: '$_id', // Start with movies that contain Arnold's _id
    connectFromField: 'actors', // Match actors in one movie...
    connectToField: 'actors', // to actors in another movie
    as: 'connections',
    // Add a 'steps' property to each connections subdoc that contains
    // the number of steps needed to get to this movie
    depthField: 'steps'
  }).
  exec();
```

Moving On
---------

The `$graphLookup` stage is just one of the many new aggregation features in MongoDB 3.4. The `$graphLookup` stage lets you recursively search MongoDB collections to find
friends of friends and Bacon numbers. Make sure you upgrade and check it out!

In a future article I'll discuss another exciting new feature from MongoDB 3.4, the [`$facet` stage](https://docs.mongodb.com/v3.4/reference/operator/aggregation/facet/), AKA the new favorite pipeline stage for every MongoDB-based ecommerce platform.  
