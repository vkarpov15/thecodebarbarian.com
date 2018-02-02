[MongoDB 3.4](https://docs.mongodb.com/manual/release-notes/3.4/)
has [27 new aggregation concepts](https://docs.mongodb.com/manual/release-notes/3.4/#aggregation).
Last week I covered the new [`$graphLookup` stage](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-graphlookup.html), which recursively searches collections. This week I'll cover the new [`$facet` stage](https://docs.mongodb.com/v3.4/reference/operator/aggregation/facet/) and
the related [`$bucket`](https://docs.mongodb.com/manual/reference/operator/aggregation/bucket/) and [`$bucketAuto`](https://docs.mongodb.com/v3.4/reference/operator/aggregation/bucketAuto/) operators. These new features are tailor-made for building powerful product search pages, and will quickly become your favorite aggregation features if you're working on
an ecommerce product.

What is Faceted Search?
-----------------------

Here's the view you see when searching for products on Amazon:

<a href="http://i.imgur.com/JXjcuZn.png"><img src="http://i.imgur.com/JXjcuZn.png" width="300"></a>

The "Refine By" menu on the left is a classic example of faceted search. When you
only want to see products that are eligible for Amazon prime, the counts in
the "Refine By" menu update to only reflect products that are eligible for Prime.
For example, there are 26 products in the $10-$25 range, but only 7 of those
are eligible for Prime.

<a href="http://i.imgur.com/jkRdMh0.png"><img src="http://i.imgur.com/jkRdMh0.png" width="300"></a>

Updating these counts in a sane and performant way was a huge pain before
MongoDB 3.4. Your options were to either [re-structure your data specifically for faceted search](https://www.mongodb.com/blog/post/faceted-search-with-mongodb) or execute a separate aggregation for every single individual "facet" you want to
filter by.

Let's take a look at a more concrete example. Here's a collection of 4 books:

```javascript
db.books.insertMany([
  {
    title: 'Professional AngularJS',
    author: 'Valeri Karpov',
    price: 37,
    year: 2015,
    tags: ['JavaScript', 'AngularJS']
  },
  {
    title: 'The 80/20 Guide To ES2015 Generators',
    author: 'Valeri Karpov',
    price: 10,
    year: 2016,
    tags: ['JavaScript', 'ES6']
  },
  {
    title: 'Total Recall: My Unbelievably True Life Story',
    author: 'Arnold Schwarzenegger',
    price: 32,
    year: 2013,
    tags: ['Biography']
  },
  {
    title: "Arnold's Bodybuilding for Men",
    author: 'Arnold Schwarzenegger',
    price: 14,
    year: 1984,
    tags: ['Fitness']
  }
]);
```

In order to enable faceted search by year, you need to run an aggregation query
that buckets books by the year they were published.

```javascript
db.books.aggregate([
  // Count the number of books published in a given year
  {
    $group: {
      _id: '$year',
      count: { $sum: 1 }
    }
  },
  // Sort by year descending
  { $sort: { count: -1, _id: -1 } }
]);

// Output
{ "_id" : 2016, "count" : 1 }
{ "_id" : 2015, "count" : 1 }
{ "_id" : 2013, "count" : 1 }
{ "_id" : 1984, "count" : 1 }
```

To drill down into just books by Arnold Schwarzenegger, you'd need to add a
`$match` query.

```javascript
db.books.aggregate([
  // Just Arnold's books
  { $match: { author: 'Arnold Schwarzenegger' } },
  // Count the number of books published in a given year
  {
    $group: {
      _id: '$year',
      count: { $sum: 1 }
    }
  },
  // Sort by year descending
  { $sort: { count: -1, _id: -1 } }
]);

// Output
{ "_id" : 2013, "count" : 1 }
{ "_id" : 1984, "count" : 1 }
```

However, you need to execute a separate aggregation for every other facet.
For example, in MongoDB 3.2 there would be no good way to get both the
author counts and the year counts in a single aggregation. You'd have to
execute the below aggregation separately to get the author counts.

```javascript
db.books.aggregate([
  // Count the number of books published in a given year
  {
    $group: {
      _id: '$author',
      count: { $sum: 1 }
    }
  },
  // Sort by author name ascending
  { $sort: { count: -1, _id: 1 } }
]);

// Output
{ "_id" : "Arnold Schwarzenegger", "count" : 2 }
{ "_id" : "Valeri Karpov", "count" : 2 }
```

Furthermore, there
was no way to bucket books by price. The `$group` stage lets you count up
the number of books that cost $10 exactly, but there's no way to group books
by which ones are in the $10-$25 price range versus the $25-$50 range.
At [BookaLokal](https://www.crunchbase.com/organization/bookalokal-inc#/entity) and [SixPlus](https://www.crunchbase.com/organization/sixplus#/entity) we gave
up on using aggregation for this and just used a Node.js stream to count up
the different facets. However, `$facet` and `$bucket` make it possible to count
up facets in a single aggregation.

Introducing `$facet` and `$bucket`
----------------------------------

`$facet` is fundamentally an aggregation stage that executes
multiple aggregation pipelines in parallel and spits out the combined result
when the pipelines are all done. You can think of it as
[`async.parallel()`](http://caolan.github.io/async/docs.html#parallel) or [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) for aggregation pipelines.

Sounds complicated, so here's a concrete example. Remember the 2 separate
aggregations for counting books by year and books by author? Here's the same
2 aggregations combined into a single aggregation with `$facet`. The
`$facet` stage lets you execute both pipelines in parallel and store the
output from both pipelines in a single document.

```javascript
db.books.aggregate([
  {
    $facet: {
      // The `years` property will be the output of the 'count by year' pipeline
      years: [
        // Count the number of books published in a given year
        {
          $group: {
            _id: '$year',
            count: { $sum: 1 }
          }
        },
        // Sort by year descending
        { $sort: { count: -1, _id: -1 } }
      ],
      // The `authors` property will be the output of the 'count by authors' pipeline
      authors: [
        // Count the number of books published in a given year
        {
          $group: {
            _id: '$author',
            count: { $sum: 1 }
          }
        },
        // Sort by author name ascending
        { $sort: { count: -1, _id: 1 } }
      ]
    }
  }
]);

// Output
{
	"years" : [
		{
			"_id" : 2016,
			"count" : 1
		},
		{
			"_id" : 2015,
			"count" : 1
		},
		{
			"_id" : 2013,
			"count" : 1
		},
		{
			"_id" : 1984,
			"count" : 1
		}
	],
	"authors" : [
		{
			"_id" : "Arnold Schwarzenegger",
			"count" : 2
		},
		{
			"_id" : "Valeri Karpov",
			"count" : 2
		}
	]
}
```

One big advantage of using `$facet` is that you can combine `$match` with
`$facet`. If you execute a separate aggregation for every facet, you have to
execute the same `$match` query for every facet, which can be a lot of wasted
work. With `$facet`, you can execute `$match` once and use then `$facet`.

```javascript
db.books.aggregate([
  // Just Arnold's books
  { $match: { author: 'Arnold Schwarzenegger' } },
  {
    $facet: { /** same $facet stage as before */ }
  }
]);
```

What about grouping by price? That's what the `$bucket` operator does for you.
Here's `$bucket` without `$facet`.

```javascript
db.books.aggregate([
  {
    $bucket: {
      // Bucket by price
      groupBy: '$price',
      // With 3 price ranges: [0, 10), [10, 25), [25, 50)
      boundaries: [0, 10, 25, 50]
    }
  }
]);

// Output. The `_id` is the lower bound of the price range
{ "_id" : 10, "count" : 2 }
{ "_id" : 25, "count" : 2 }
```

If you don't care about setting up ranges manually, `$bucketAuto` will
automatically break your documents up into a specified number of buckets.

```javascript
db.books.aggregate([
  {
    $bucketAuto: {
      // Bucket by price
      groupBy: '$price',
      // And break it up into 2 buckets
      buckets: 2
    }
  }
]);

// Output. `_id` represents the range of each bucket
{ "_id" : { "min" : 10, "max" : 32 }, "count" : 2 }
{ "_id" : { "min" : 32, "max" : 37 }, "count" : 2 }
```

You can combine `$bucketAuto` with the established `$facet` query to get
counts for every facet:

```javascript
db.books.aggregate([
  {
    $facet: {
      // The `years` property will be the output of the 'count by year' pipeline
      years: [/* ... */],
      // The `authors` property will be the output of the 'count by authors' pipeline
      authors: [/* ... */],
      price: [
        {
          $bucketAuto: {
            // Bucket by price
            groupBy: '$price',
            // And break it up into 2 buckets
            buckets: 2
          }
        }
      ]
    }
  }
]);

// Output
{
	"years" : [/* ... */],
	"authors" : [/* ... */],
	"price" : [
		{
			"_id" : {
				"min" : 10,
				"max" : 32
			},
			"count" : 2
		},
		{
			"_id" : {
				"min" : 32,
				"max" : 37
			},
			"count" : 2
		}
	]
}
```

`$facet` and `$bucket` in Node.js
---------------------------------

There are no version restrictions that I'm aware of on using `$facet`,
`$bucket`, and `$bucketAuto` in mongodb and mongoose. The below scripts
work at least as far back as `mongodb@2.1.0` and `mongoose@4.5.0`:

```javascript
const mongodb = require('mongodb');

mongodb.MongoClient.connect('mongodb://localhost:27017/test').
  then(db => db.collection('books').aggregate([
    {
      $facet: {
        // The `years` property will be the output of the 'count by year' pipeline
        years: [
          // Count the number of books published in a given year
          {
            $group: {
              _id: '$year',
              count: { $sum: 1 }
            }
          },
          // Sort by year descending
          { $sort: { count: -1, _id: -1 } }
        ],
        // The `authors` property will be the output of the 'count by authors' pipeline
        authors: [
          // Count the number of books published in a given year
          {
            $group: {
              _id: '$author',
              count: { $sum: 1 }
            }
          },
          // Sort by author name ascending
          { $sort: { count: -1, _id: 1 } }
        ],
        price: [
          {
            $bucketAuto: {
              // Bucket by price
              groupBy: '$price',
              // And break it up into 2 buckets
              buckets: 2
            }
          }
        ]
      }
    }
  ]).toArray()).
  then(res => console.log(JSON.stringify(res, null, '  '))).
  catch(error => console.error('error', error));
```

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/test');

var Book = mongoose.model('Book', new mongoose.Schema());

Book.aggregate([
  {
    $facet: {
      // The `years` property will be the output of the 'count by year' pipeline
      years: [
        // Count the number of books published in a given year
        {
          $group: {
            _id: '$year',
            count: { $sum: 1 }
          }
        },
        // Sort by year descending
        { $sort: { count: -1, _id: -1 } }
      ],
      // The `authors` property will be the output of the 'count by authors' pipeline
      authors: [
        // Count the number of books published in a given year
        {
          $group: {
            _id: '$author',
            count: { $sum: 1 }
          }
        },
        // Sort by author name ascending
        { $sort: { count: -1, _id: 1 } }
      ],
      price: [
        {
          $bucketAuto: {
            // Bucket by price
            groupBy: '$price',
            // And break it up into 2 buckets
            buckets: 2
          }
        }
      ]
    }
  }
]).
then(res => console.log(res)).
catch(error => console.error('error', error));
```

Mongoose 4.8.0 will include a helper for `$facet` for its
[chainable aggregation pipeline builder](http://mongoosejs.com/docs/api.html#aggregate-js):

```javascript
MyModel.aggregate().facet({
  field1: [/* pipeline 1 */],
  field2: [/* pipeline 2 */]
}).exec();
```

Moving On
---------

MongoDB 3.4 has an incredible variety of new aggregation features, including
`$facet` and [`$graphLookup`](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-graphlookup.html). If you have graph data or an ecommerce search page, make
sure to upgrade to take advantage of these new features so you can delete
hundreds of lines of unnecessary code. Next week, I'll cover the new [decimal type](https://docs.mongodb.com/manual/tutorial/model-monetary-data/). The decimal type enables accurate base 10 arithmetic and avoids the [myriad fundamental flaws of floating point arithmetic](https://en.wikipedia.org/wiki/Floating_point#Accuracy_problems),
so you can finally stop copy/pasting `_.round(price, 2)`. 
