[Mongoose 5.3.0](https://github.com/Automattic/mongoose/blob/master/History.md#530--2018-09-28) was shipped on September 28. This minor release includes 17 new features and improvements, including support for JavaScript's new [async iterator](http://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js) feature. Async iterators were introduced in [ECMAScript 2018](https://medium.com/front-end-hacking/javascript-whats-new-in-ecmascript-2018-es2018-17ede97f36d5) and are natively supported in Node.js 10.x.

Async iterators add support for a new loop structure, a `for/await/of` loop,
that looks like what you see below.

```javascript
for await (const obj of asyncIterator) {
  console.log(obj);
}
```

If you've read [_Mastering Async/Await_](http://asyncawait.net/), you know that `await` must be in a function marked `async`. Async iterators are no exception. You can only use a `for/await/of` loop in an async function. If you're not comfortable with async/await, [this blog post](/common-async-await-design-patterns-in-node.js.html) will bring you up to speed.

Now that the syntax is out of the way, let's take a look at how Mongoose leverages async iterators to make scanning through huge collections easier.

Async Iterators With Mongoose Queries
-------------------------------------

Suppose you have a collection of stocks and you want to pull the current price for each stock from the [IEX API](https://iextrading.com/developer/). Below are the [schema](https://mongoosejs.com/docs/guide.html) and [model](https://mongoosejs.com/docs/models.html) for this example.

```javascript
const stockSchema = new Schema({
  symbol: { type: String, required: true },
  currentPrice: Number
});

const Stock = mongoose.model('Stock', stockSchema);
```

Suppose you have only 3 stocks in your collection:

```javascript
await Stock.create([{ symbol: 'MDB' }, { symbol: 'F' }, { symbol: 'T' }]);
```

Without async iterators, you could iterate through all stocks like this:

```javascript
const allStocks = await Stock.find();
for (const stock of allStocks) {
  const price = await superagent.
    get(`https://api.iextrading.com/1.0/stock/${stock.symbol}/price`).
    then(res => res.body);
  console.log(stock.symbol, price);
  stock.price = price;
  await stock.save();
}
```

The problem with the above approach is that it loads all stocks _before_ starting the loop. That's fine for 3 stocks, but if you have thousands you should instead use a [Mongoose cursor](/cursors-in-mongoose-45). You can use [async/await to iterate through a cursor](/common-async-await-design-patterns-in-node.js.html#processing-a-mongodb-cursor) as shown below.

```javascript
const cursor = Stock.find().cursor();
for (let stock = await cursor.next(); stock != null; stock = await cursor.next()) {
  const price = await superagent.
    get(`https://api.iextrading.com/1.0/stock/${stock.symbol}/price`).
    then(res => res.body);
  console.log(stock.symbol, price);
  stock.price = price;
  await stock.save();
}
```

This syntax works, but it is verbose and tends to run over 80 character line limits if you use readable variable names. Async iterators make iterating over a cursor much more terse: if you use a [Mongoose query](https://mongoosejs.com/docs/queries.html) as the right hand side of a `for/await/of` loop, Mongoose will create an async-iterator-friendly cursor for you. The below loop is equivalent to the `await cursor.next()` loop above, as long as you're using Node.js 10.x.

```javascript
for await (const stock of Stock.find()) {
  const price = await superagent.
    get(`https://api.iextrading.com/1.0/stock/${stock.symbol}/price`).
    then(res => res.body);
  console.log(stock.symbol, price);
  stock.price = price;
  await stock.save();
}
```

Configuring Async Iterator Cursors
----------------------------------

The [`sort()`](https://mongoosejs.com/docs/api.html#query_Query-sort), [`limit()`](https://mongoosejs.com/docs/api.html#query_Query-limit), [`skip()`](https://mongoosejs.com/docs/api.html#query_Query-skip), and [`lean()`](https://mongoosejs.com/docs/api.html#query_Query-lean) helpers all work as you would expect with async iterators.

```javascript
// Sort by symbol, skip the first 5, return at most 20, and don't hydrate
// the returned doc. See https://mongoosejs.com/docs/api.html#model_Model.hydrate
const query = Stock.find().sort({ symbol: 1 }).skip(5).limit(20).lean();
for await (const stock of query) {
  const price = await superagent.
    get(`https://api.iextrading.com/1.0/stock/${stock.symbol}/price`).
    then(res => res.body);
  console.log(stock.symbol, price);
  // No `save()` because `stock` is lean
}
```

[Query `populate()`](https://mongoosejs.com/docs/api.html#query_Query-populate)
also works, but with a small performance caveat. If you use `populate()` with a
cursor, Mongoose will execute a separate query for each document that comes off
the cursor. For example, suppose you store stock prices in a separate collection.

```javascript
const priceSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  price: { type: Number, required: true }
}, { timestamps: true /* Adds `createdAt` */ });

const Price = mongoose.model('Price', priceSchema);

const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true }
});

// Automatically populate the latest price based on `createdAt`
stockSchema.virtual('latestPrice', {
  ref: 'Price',
  localField: 'symbol',
  foreignField: 'symbol',
  justOne: true,
  options: {
    sort: { createdAt: -1 }
  }
});
```

Suppose you turn on [Mongoose's debug mode](https://mongoosejs.com/docs/api.html#mongoose_Mongoose-set) and `populate()` the `latestPrice` when iterating over the query cursor using `for/await/of`:

```javascript
mongoose.set('debug', true);
for await (const stock of Stock.find().populate('latestPrice')) {
  console.log(stock.symbol, stock.latestPrice.price);
}
```

You'll see Mongoose executes one `find()` to get the cursor, and then a separate `find()` to populate each stock's `latestPrice`:

```
Mongoose: stocks.find({}, { projection: {} })
Mongoose: prices.find({ symbol: { '$in': [ 'MDB' ] } }, { sort: { createdAt: -1 }, projection: {} })
MDB 70
Mongoose: prices.find({ symbol: { '$in': [ 'F' ] } }, { sort: { createdAt: -1 }, projection: {} })
F 9
Mongoose: prices.find({ symbol: { '$in': [ 'T' ] } }, { sort: { createdAt: -1 }, projection: {} })
T 33
```

Common Pitfalls
---------------

A Mongoose cursor does **not** conform to the [async iterable spec](https://github.com/tc39/proposal-async-iteration#async-iterators-and-async-iterables). If you use `for/await/of` with a Mongoose cursor you created yourself, you will get an error.

```javascript
// Throws "TypeError: Stock.find(...).cursor(...) is not async iterable"
for await (const stock of Stock.find().cursor()) {
  console.log(stock.symbol);
}
```

Moving On
---------

Async iterator support is just one of 17 new features in Mongoose 5.3.0. Mongoose 5.3.0 also introduced the [`orFail()` query helper](/whats-new-in-mongoose-53-orfail-and-global-toobject.html), a [`deleteModel()` helper](https://mongoosejs.com/docs/api.html#connection_Connection-deleteModel) to clean up models after tests, and [regular expression support for `Schema.pre()` and `Schema.post()`](https://mongoosejs.com/docs/api.html#schema_Schema-pre). Make sure you upgrade and take advantage of these powerful new features!

_Looking to get up to speed with async/await? My new ebook, Mastering Async/Await, is designed to give you an integrated understanding of
async/await fundamentals and how async/await fits in the JavaScript ecosystem in a few hours. <a href="http://asyncawait.net/">Get your copy!</a>_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
