MongoDB 3.2 supports 3 numeric types: [32 bit integers, 64 bit integers, and 64 bit binary floating points](http://bsonspec.org/spec.html). MongoDB 3.4 introduces a
4th type: [128 bit decimal floating point](https://docs.mongodb.com/manual/core/shell-types/#shell-type-decimal), also
known as "decimal" or "Decimal128". The decimal type provides a workaround for the
numerous [fundamental issues](https://en.wikipedia.org/wiki/Floating_point#Accuracy_problems) inherent to using binary floating points to represent
base 10 values.

What's Wrong With Binary Floating Points?
-----------------------------------------

Here's a quick example of inserting a document into MongoDB with a property
`x` with initial value 0.1, and then incrementing it by 0.2. The resulting
value of `x` is **not** 0.3.

```
$ mongo test
MongoDB shell version: 3.2.10
connecting to: test
>
> db.test.insertOne({ x: 0.1 })
{
	"acknowledged" : true,
	"insertedId" : ObjectId("588a3f711554cc7d70642fa1")
}
> db.test.updateOne({}, { $inc: { x: 0.2 } })
{ "acknowledged" : true, "matchedCount" : 1, "modifiedCount" : 1 }
> db.test.findOne()
{ "_id" : ObjectId("588a3f711554cc7d70642fa1"), "x" : 0.30000000000000004 }
>
```

This problem is not limited to MongoDB, you get the same result in node:

```
$ node
> 0.1
0.1
> 0.2
0.2
> 0.1 * 0.2
0.020000000000000004
> 0.1 * 0.1
0.010000000000000002
>
```

Silly JavaScript, can't even do math right. Let's try Python.

```
$ python
Python 2.7.6 (default, Jun 22 2015, 17:58:13)
[GCC 4.8.2] on linux2
Type "help", "copyright", "credits" or "license" for more information.
>>> 0.1
0.1
>>> 0.2
0.2
>>> 0.1 + 0.2
0.30000000000000004
```

The fundamental issue is not with MongoDB, JavaScript, or Python, it's with how
0.1 is represented in binary: `0.00011001100110011...`, a repeating decimal over
`0011`. In other words, 0.1 is not representable by binary floating points.
Nor are seemingly innocuous numbers like 1.126 and 1.789.

<img src="http://i.imgur.com/lzcuVPE.png" />

These accuracy problems make using floating points for monetary values cumbersome at best. Small errors add up fast, especially when you have floating point numbers that
accumulate values over time like [keeping track of the amount of fuel that should be in an tanker](https://www.boosterfuels.com/join-the-team). In MongoDB 3.2 your only options were to either round values in the client or use a [scale factor](https://docs.mongodb.com/manual/tutorial/model-monetary-data/#numeric-model) (converting to an integer for the purposes of arithmetic and then dividing again).

Using the decimal type, these accuracy issues are no longer a problem. The
fundamental idea of the decimal type is that it represents numbers in base 10,
rather than base 2. 0.1 is [neatly representable using the hex string '01000000000000000000000000003e30'](https://en.wikipedia.org/wiki/Decimal128_floating-point_format).

```
$ mongo test
MongoDB shell version v3.4.1
connecting to: mongodb://127.0.0.1:27017/test
> db.test.insertOne({ x: NumberDecimal('0.1') })
{
	"acknowledged" : true,
	"insertedId" : ObjectId("588a448a3eef9d93ffc9f197")
}
> db.test.updateOne({}, { $inc: { x: NumberDecimal('0.2') } })
{ "acknowledged" : true, "matchedCount" : 1, "modifiedCount" : 1 }
> db.test.findOne()
{ "_id" : ObjectId("588a448a3eef9d93ffc9f197"), "x" : NumberDecimal("0.3") }
>
```

Mixing decimal floating points and binary floating points is likely a bad idea, but
MongoDB seems to handle that too:

```
> db.test.insertOne({ x: NumberDecimal('0.1') })
{
	"acknowledged" : true,
	"insertedId" : ObjectId("588a4a708cefd826806dbe19")
}
> db.test.updateOne({}, { $inc: { x: 0.2 } })
{ "acknowledged" : true, "matchedCount" : 1, "modifiedCount" : 1 }
> db.test.findOne()
{
	"_id" : ObjectId("588a4a708cefd826806dbe19"),
	"x" : NumberDecimal("0.300000000000000")
}
>
```

```
> db.test.insertOne({ x: 0.1 })
{
	"acknowledged" : true,
	"insertedId" : ObjectId("588a4a94c215d53cf9d8f3d5")
}
> db.test.updateOne({}, { $inc: { x: NumberDecimal('0.2') } })
{ "acknowledged" : true, "matchedCount" : 1, "modifiedCount" : 1 }
> db.test.findOne()
{
	"_id" : ObjectId("588a4a94c215d53cf9d8f3d5"),
	"x" : NumberDecimal("0.300000000000000")
}
>
```

Decimal in Node.js
------------------

JavaScript has no native support for decimal floating points, so working with
the decimal type has some troublesome edge cases. Here's a rudimentary example
of using the decimal type in Node.js.

Keep in mind that the decimal type is new in version 2.2.0 of the MongoDB
Node.js driver, so make sure you use `mongodb >= 2.2.0`.

```javascript
const mongodb = require('mongodb');

let db;
mongodb.MongoClient.connect('mongodb://localhost:27017/test').
  then(_db => {
    db = _db;
    return db.collection('test').insertOne({ x: mongodb.Decimal128.fromString('0.1') });
  }).
  then(() => db.collection('test').updateOne({}, { $inc: { x: mongodb.Decimal128.fromString('0.2') } })).
  then(() => db.collection('test').findOne()).
  then(res => console.log(JSON.stringify(res, null, '  '))).
  catch(error => console.error('error', error));
```

The output of this script looks like this:

```
$ node decimal.js
{
  "_id": "588a4d181a468447d61bd118",
  "x": {
    "$numberDecimal": "0.3"
  }
}
```

The key detail you should notice is that the JSON output is in [MongoDB extended JSON format](https://docs.mongodb.com/manual/reference/mongodb-extended-json/) (the `$numberDecimal` property) and the decimal is represented as a string rather than
a number. Switching back and forth between extended JSON and the actual Decimal
type is easy with the [`mongodb-extended-json` npm package](https://www.npmjs.com/package/mongodb-extended-json).

As of this writing, the Decimal type in Node.js does **not** have any arithmetic
helpers.

```
> Decimal128.fromString('0.1').add(Decimal128.fromString('0.2'))
TypeError: Decimal128.fromString(...).add is not a function
    at repl:1:30
```

To do arithmetic in Node.js, you would need to convert the decimal's string
representation to a native JavaScript number. You can also [get into the nitty-gritty of manipulating the buffer underlying the MongoDB driver's decimal type](https://github.com/mongodb/js-bson/blob/1268c4bb0e04d8df31a5f0f2073d5d70e98c487a/lib/bson/decimal128.js#L79-L94) but I wouldn't recommend it. In most simple cases, the decimal string representation should be easy to convert to a number
using [`parseFloat()`](http://www.w3schools.com/jsref/jsref_parsefloat.asp).

Mongoose 4.8.0 also has support for the decimal type. [Mongoose's type casting](http://mongoosejs.com/docs/schematypes.html)
really shines here, it automatically converts strings into decimals for you:

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/test');

var Doc = mongoose.model('Test', new mongoose.Schema({
  x: mongoose.Schema.Types.Decimal
}));

Doc.create({ x: '0.1' }).
  then(doc => doc.update({ $inc: { x: '0.2' } }).then(() => doc)).
  then(doc => Doc.findById(doc)).
  then(doc => console.log('doc', doc.toObject())).
  catch(error => console.error(error));

// Output
doc { _id: 588a5a0b9621524d3d84a059,
  x: { '$numberDecimal': '0.3' },
  __v: 0 }
```

Moving On
---------

MongoDB 3.4 has some amazing new features - I already covered the new
aggregation operators [`$facet`](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-facet.html) and [`$graphLookup`](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-graphlookup.html). The Decimal type is just as impressive: it enables accurate
arithmetic with `$inc` and `$mult`, so you don't have to round repeatedly.
Decimal is still tricky to use in Node.js, but promises to make math in JavaScript
a lot more sane.
