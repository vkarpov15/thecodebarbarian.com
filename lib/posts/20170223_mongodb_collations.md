[Collations](https://docs.mongodb.com/manual/reference/collation/) are another great new feature in [MongoDB 3.4](https://docs.mongodb.com/manual/reference/collation/). You can think of collations as a way to configure how MongoDB orders and compares strings. In this article, I'll demonstrate some basic uses of collations and show how to use them in Node.js with [the MongoDB driver](https://www.npmjs.com/package/mongodb) and [mongoose](https://www.npmjs.com/package/mongoose).

Ignoring Diacritics
-------------------

At a previous company I was tasked with implementing a city search bar much like
Airbnb's:

<img src="http://i.imgur.com/H8rxitP.png">

The problem is how to make "San Jose" match "San Jos&eacute;" with the acute accent over the 'e'. Before collations, your best bet would be to use a module like [diacritics](https://www.npmjs.com/package/diacritics) to remove all diacritics from the city. In practice you would have a `displayName` that would include diacritics for display, and a `searchName` with diacritics removed for searching.

With collations, searching with diacritics is easy. Let's say you insert 2 documents, one with "San Jose" as the California city is commonly spelled, and another with "San Jos&eacute;".

```
> db.cities.insertMany([{ name: 'San Jose' }, { name: 'San José' }])
{
	"acknowledged" : true,
	"insertedIds" : [
		ObjectId("58af53b1dd6258670ac02a5b"),
		ObjectId("58af53b1dd6258670ac02a5c")
	]
}
```

If you use the new `collation()` function, you can make MongoDB ignore the differences in diacritics using the `strength` option. The [collation arguments](https://docs.mongodb.com/manual/reference/collation/#collation-document) take experience to become comfortable with. For now, remember that `strength: 1` means MongoDB will ignore case and diacritics.

```
> db.cities.find({ name: 'San Jose' }).collation({ locale: 'en_US', strength: 1 }).pretty()
{ "_id" : ObjectId("58af560ce96c6b1ca7e5b922"), "name" : "San Jose" }
{ "_id" : ObjectId("58af560ce96c6b1ca7e5b923"), "name" : "San José" }
>
```

Keep in mind that collations do _not_ currently work with regular expression search, so `db.cities.find({ name: /^San Jose/ })` will not match "San Jos&eacute;".

Case Insensitive Sorting
------------------------

Collations aren't just useful for matching, they also help with sorting. By default MongoDB sorts strings by their characters' ASCII order (modulo non-ASCII characters), so 'Alpha' comes before 'Zeta' comes before '\_' comes before 'alpha'.

```
> db.words.insertMany([{ v: 'Alpha', }, { v: 'Zeta' }, { v: '_' }, { v: 'alpha' }, { v: 'zeta' }])
{
	"acknowledged" : true,
	"insertedIds" : [
		ObjectId("58af6376b6f40a81313d78db"),
		ObjectId("58af6376b6f40a81313d78dc"),
		ObjectId("58af6376b6f40a81313d78dd"),
		ObjectId("58af6376b6f40a81313d78de"),
		ObjectId("58af6376b6f40a81313d78df")
	]
}
> db.words.find({}).sort({ v: 1 })
{ "_id" : ObjectId("58af6376b6f40a81313d78db"), "v" : "Alpha" }
{ "_id" : ObjectId("58af6376b6f40a81313d78dc"), "v" : "Zeta" }
{ "_id" : ObjectId("58af6376b6f40a81313d78dd"), "v" : "_" }
{ "_id" : ObjectId("58af6376b6f40a81313d78de"), "v" : "alpha" }
{ "_id" : ObjectId("58af6376b6f40a81313d78df"), "v" : "zeta" }
>
```

The `caseLevel` option, if set, sorts so that 'alpha' and 'Alpha' come before 'zeta' and 'Zeta'.

```
> db.words.find({}).sort({ v: 1 }).collation({ locale: 'en_US', caseLevel: true })
{ "_id" : ObjectId("58af6376b6f40a81313d78dd"), "v" : "_" }
{ "_id" : ObjectId("58af6376b6f40a81313d78de"), "v" : "alpha" }
{ "_id" : ObjectId("58af6376b6f40a81313d78db"), "v" : "Alpha" }
{ "_id" : ObjectId("58af6376b6f40a81313d78df"), "v" : "zeta" }
{ "_id" : ObjectId("58af6376b6f40a81313d78dc"), "v" : "Zeta" }
>
```

Ordering Numeric Strings
------------------------

Another annoying issue with sorting strings is handling numbers. For example, let's say you insert a bunch of files named 'invoice_1', 'invoice_2', 'invoice_10', and 'invoice_100'. In conventional sort order, 'invoice_2' will come after 'invoice_10' and 'invoice_100'.

```
> db.files.insertMany([{ name: 'invoice_1' }, { name: 'invoice_2' }, { name: 'invoice_10' }, { name: 'invoice_100' }])
> db.files.find().sort({ name: 1 })
{ "_id" : ObjectId("58af6568b6f40a81313d78e0"), "name" : "invoice_1" }
{ "_id" : ObjectId("58af6568b6f40a81313d78e2"), "name" : "invoice_10" }
{ "_id" : ObjectId("58af6568b6f40a81313d78e3"), "name" : "invoice_100" }
{ "_id" : ObjectId("58af6568b6f40a81313d78e1"), "name" : "invoice_2" }
```

If you turn on the `numericOrdering` flag, MongoDB will sort numeric substrings based on their numeric value rather than by ASCII characters. In other words, the order will be 'invoice_1', 'invoice_2', 'invoice_10', 'invoice_100', which makes more sense in this case.

```
> db.files.find().sort({ name: 1 }).collation({ locale: 'en_US', numericOrdering: true })
{ "_id" : ObjectId("58af6568b6f40a81313d78e0"), "name" : "invoice_1" }
{ "_id" : ObjectId("58af6568b6f40a81313d78e1"), "name" : "invoice_2" }
{ "_id" : ObjectId("58af6568b6f40a81313d78e2"), "name" : "invoice_10" }
{ "_id" : ObjectId("58af6568b6f40a81313d78e3"), "name" : "invoice_100" }
>
```

Collations in Node.js
---------------------

Version [2.2.10](https://github.com/mongodb/node-mongodb-native/blob/2.2/HISTORY.md#2210-2016-09-15) of the MongoDB driver and Mongoose [4.8.0](https://github.com/Automattic/mongoose/blob/master/History.md#480--2017-01-28) include helpers for collations. Here's an example of using a collation with `find()` using the MongoDB driver:

```javascript
const mongodb = require('mongodb');

let db

mongodb.MongoClient.connect('mongodb://localhost:27017/test').
  then(_db => { db = _db }).
  then(() => db.dropDatabase()).
  then(() => db.collection('files').insertMany([
    { name: 'invoice_1' },
    { name: 'invoice_2' },
    { name: 'invoice_10' },
    { name: 'invoice_100' }
  ])).
  then(() => db.collection('files').
     find({}, { collation: { locale: 'en_US', numericOrdering: true } }).
     sort({ name: 1 }).
     toArray()
  ).
  then(docs => console.log(docs));

// Output
[ { _id: 58af7b819ed98b28c1f2bb52, name: 'invoice_1' },
  { _id: 58af7b819ed98b28c1f2bb53, name: 'invoice_2' },
  { _id: 58af7b819ed98b28c1f2bb54, name: 'invoice_10' },
  { _id: 58af7b819ed98b28c1f2bb55, name: 'invoice_100' } ]
```

And using the mongoose query builder's `collation()` helper function:

```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/test');

var File = mongoose.model('File', new mongoose.Schema({ name: String }));

File.find().sort({ name: 1 }).collation({ locale: 'en_US', numericOrdering: true }).
  then(docs => console.log(docs));

// Output
[ { _id: 58af7b819ed98b28c1f2bb52, name: 'invoice_1' },
  { _id: 58af7b819ed98b28c1f2bb53, name: 'invoice_2' },
  { _id: 58af7b819ed98b28c1f2bb54, name: 'invoice_10' },
  { _id: 58af7b819ed98b28c1f2bb55, name: 'invoice_100' } ]
```

Moving On
---------

Collations are powerful, but far from the only great new feature in MongoDB 3.4. I previously wrote about the [Decimal type](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-decimal.html), the [`$facet` aggregation operator](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-facet.html), and the [`$graphLookup` aggregation operator](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-graphlookup.html). Check out those articles and learn how to take advantage of MongoDB 3.4 in Node.js!
