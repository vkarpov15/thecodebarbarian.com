MongoDB 3.2 introduced the [`$lookup` aggregation framework pipeline stage](https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/), which let you pull documents from a separate collection into your aggregation framework pipeline. Before MongoDB 3.6, `$lookup` could only do [left outer joins with equality matching](https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/#equality-match). In other words, suppose you had a collection of users, a collection of stocks, and a collection that mapped users to the stocks they hold. The `$lookup` stage can give you an array of stocks a user holds. But in MongoDB 3.2 and 3.4, `$lookup` could not give you just the stocks that had gone up in price since the customer bought them.

```javascript
const { MongoClient } = require('mongodb');

run().catch(error => console.error(error.stack));

async function run() {
  const client = await MongoClient.connect('mongodb://localhost:27017/test');
  const db = client.db('test');

  await db.dropDatabase();

  // Create 2 users
  const users = [
    { name: 'Benjamin Graham' },
    { name: 'Warren Buffett' }
  ];
  await db.collection('User').insertMany(users);

  // Create 4 stocks with their approximate `currentPrice`
  const stocks = [
    { ticker: 'AAPL', currentPrice: 172.5 },
    { ticker: 'ORCL', currentPrice: 51 },
    { ticker: 'BRK.B', currentPrice: 202 },
    { ticker: 'LMT', currentPrice: 360 }
  ];
  await db.collection('Stock').insertMany(stocks);

  // Create a many-to-many mapping of users to the stocks they hold, with
  // the `basePrice` that they originally bought the stock at
  const stockHoldings = [
    { userId: users[0]._id, stock: 'AAPL', shares: 5, basePrice: 170 },
    { userId: users[0]._id, stock: 'ORCL', shares: 10, basePrice: 50 },
    { userId: users[1]._id, stock: 'BRK.B', shares: 5, basePrice: 200 },
    { userId: users[1]._id, stock: 'LMT', shares: 5, basePrice: 370 }
  ];
  await db.collection('StockHolding').insertMany(stockHoldings);

  // The only way to use `$lookup` in MongoDB 3.2 and 3.4
  const docs = await db.collection('StockHolding').aggregate([
    {
      $lookup: {
        from: 'Stock',
        localField: 'stock',
        foreignField: 'ticker',
        as: 'stock'
      }
    },
    {
      $unwind: '$stock'
    },
    {
      $project: {
        _id: 0,
        ticker: '$stock.ticker',
        currentPrice: '$stock.currentPrice',
        basePrice: 1,
        shares: 1
      }
    }
  ]).toArray();

  // [ { shares: 5, basePrice: 170, ticker: 'AAPL', currentPrice: 172.5 },
  //   { shares: 10, basePrice: 50, ticker: 'ORCL', currentPrice: 51 },
  //   { shares: 5, basePrice: 200, ticker: 'BRK.B', currentPrice: 202 },
  //   { shares: 5, basePrice: 370, ticker: 'LMT', currentPrice: 360 } ]
  console.log(docs);
}
```

MongoDB 3.6 introduces support for much more sophisticated lookups with the [new `$expr` operator](https://docs.mongodb.com/manual/reference/operator/query/expr/#op._S_expr). In particular, `$expr` allows you to do a `$lookup` that only pulls stock holdings that have appreciated in value. In this article, I'll show you how to use the `$expr` operator with queries, as well as with `$lookup`.

I'll use Node.js and the [MongoDB Node.js driver](https://www.npmjs.com/package/mongodb) directly. You should use MongoDB driver `>= 3.0.0` or Mongoose `>= 5.0.0` because those are the the versions that [support MongoDB 3.6](http://mongoosejs.com/docs/compatibility.html).

Using `$expr` With Queries
--------------------------

The `$expr` operator allows you to query based on computed properties. This is especially powerful with `$lookup`, but is also useful for queries. For example, let's say you wanted to find all stock holdings where the total cost of the stock was more than $1000. In other words, find all documents in the 'StockHolding' collection where `shares * basePrice > 1000`. In older versions of MongoDB you could do this with the [`$where` operator](https://docs.mongodb.com/manual/reference/operator/query/where/), but the `$where` operator suffers from [numerous restrictions](https://docs.mongodb.com/manual/reference/operator/query/where/#restrictions), [performance limitations](https://docs.mongodb.com/manual/reference/operator/query/where/#op._S_where), and [security issues](https://lockmedown.com/securing-node-js-mongodb-security-injection-attacks/). MongoDB recommends using `$expr` as a replacement for `$where`.

Here's how you structure this query using `$expr`. The `$expr` operator gives you access to [aggregation operators](https://docs.mongodb.com/manual/reference/operator/aggregation/), even in your queries. For this query, you can use the [`$gt` aggregation operator](https://docs.mongodb.com/manual/reference/operator/aggregation/gt/) and the [`$multiply` operator](https://docs.mongodb.com/manual/reference/operator/aggregation/multiply/). Note that the `$gt` _aggregation_ operator syntax differs slightly from that of the [`$gt` _query_ operator](https://docs.mongodb.com/manual/reference/operator/query/gt/), which is a distinct operator.

```javascript
const docs = await db.collection('StockHolding').find({
  // Equivalent to `$where: 'this.shares * this.basePrice > 1000'`
  $expr: {
    $gt: [
      { $multiply: ['$shares', '$basePrice'] },
      1000
    ]
  }
}).toArray();

// [ { _id: 5a8754447aa7d81e1082bcb2,
//     userId: 5a8754447aa7d81e1082bcaa,
//     stock: 'LMT',
//     shares: 5,
//     basePrice: 370 } ]
console.log(docs);
```

`$expr` and `$lookup`
---------------------

With a single query, you can find the stock holdings where the total cost of the holding was at least $1000. What about stock holdings where the current value of the holding is at least $1000? With the data as structured, you need to use `$lookup` because the stock's `currentPrice` is not tracked in the individual holding document. You need to do a `$lookup` that matches stocks by ticker _and_ by the product of `shares` and `currentPrice`.

The [new `$lookup` syntax](https://docs.mongodb.com/manual/reference/operator/aggregation/lookup/#specify-multiple-join-conditions-with-lookup) uses the `let` and `pipeline` properties as a replacement for `localField` and `foreignField`. Instead of doing an exact equality match looking for documents in the `from` collection where the value of `foreignField` is equal to the value of `localField`, `let` and `pipeline` let you define more sophisticated lookups. Specifically, `let` defines which properties from the local collection (in this case 'StockHolding') that you want to use, and `pipeline` defines a nested aggregation pipeline that computes the output.

For example, below is a basic `$lookup` that looks up the corresponding stock for each holding using `localField` and `foreignField`.

```javascript
const docs = await db.collection('StockHolding').aggregate([
  {
    $lookup: {
      from: 'Stock',
      localField: 'stock',
      foreignField: 'ticker',
      as: 'stock'
    }
  }
]).toArray();
```

Below is an equivalent aggregation using `let` and `pipeline`. Note that variables declared in `let` may only be used in a `$expr` operator.

```javascript
const docs = await db.collection('StockHolding').aggregate([
  {
    $lookup: {
      from: 'Stock',
      // Escape 'let' because its a reserved word in JS
      // `let` is where you pull in variables from the 'StockHolding' table
      // to use in your `$expr`
      'let': { stock: '$stock' },
      pipeline: [
        {
          $match: {
            $expr: {
              // You can only use variables from the `let` property in
              // a `$expr` operator
              $eq: ['$ticker', '$$stock']
            }
          }
        }
      ],
      as: 'stock'
    }
  }
]).toArray();
```

In this simple case, the `let` and `pipeline` approach is more complex, but the new approach is also more flexible. For example, the below pipeline finds all stock holdings whose current value is greater than $1000 based on the `shares` property from the holding document and the `currentPrice` property from the stock document.

```javascript
const docs = await db.collection('StockHolding').aggregate([
  {
    $lookup: {
      from: 'Stock',
      // Escape 'let' because its a reserved word in JS
      // `let` is where you pull in variables from the 'StockHolding' table
      // to use in your `$expr`
      'let': { ticker: '$stock', shares: '$shares' },
      pipeline: [
        {
          $match: {
            $expr: {
              // Weird but `$expr` must have exactly one key, so you need to
              // use `$and`, otherwise you get an error 'MongoError: An
              // object representing an expression must have exactly one field'
              $and: [
                // Fields prefixed with one '$' are in the 'Stock' collection,
                // that is, the `from` collection. Fields prefixed with '$$'
                // are from the `let` above
                {
                  $gt: [{ $multiply: ['$$shares', '$currentPrice'] }, 1000]
                },
                { $eq: ['$ticker', '$$ticker'] }
              ]
            }
          }
        }
      ],
      as: 'stock'
    }
  },
  {
    $unwind: '$stock'
  }
]).toArray();

// [ { _id: 5a875c8714749222508d3a24,
//     userId: 5a875c8714749222508d3a1d,
//     stock:
//      { _id: 5a875c8714749222508d3a20,
//        ticker: 'BRK.B',
//        currentPrice: 202 },
//     shares: 5,
//     basePrice: 200 },
//   { _id: 5a875c8714749222508d3a25,
//     userId: 5a875c8714749222508d3a1d,
//     stock:
//      { _id: 5a875c8714749222508d3a21,
//        ticker: 'LMT',
//        currentPrice: 360 },
//     shares: 5,
//     basePrice: 370 } ]
console.log(docs);
```

Moving On
---------

The new `$expr` operator and the new `let` and `pipeline` syntax for `$lookup` go a long way towards replicating SQL joins in MongoDB. The `pipeline` syntax goes beyond the simple left-outer joins that you could do with `localField` and `foreignField`, enabling deeply nested lookups and matching based on date and number comparisons. MongoDB 3.6 has [several more exciting new aggregation features](https://docs.mongodb.com/manual/release-notes/3.6/#aggregation) in addition to the new `$lookup` syntax, so make sure you upgrade to take advantage of all of the new features. Just make sure you upgrade to MongoDB driver `>= 3.0.0` or mongoose `>= 5.0.0` first.
