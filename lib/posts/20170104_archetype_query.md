One of [Archetype's](https://www.npmjs.com/package/archetype-js) core design goals
was to support type casting for MongoDB queries. [MongoDB ObjectIds are objects](http://mongodb.github.io/node-mongodb-native/2.2/api/ObjectID.html)
but they're usually sent over the wire as strings in JSON. In order to
use the string in a query, you need to convert it into an ObjectId.

```javascript
id = new mongodb.ObjectId(id);
```

This works fine if you have one id. The MongoDB driver will create a new
ObjectId and throw an error if it failed? But then what if you have multiple
ObjectIds? What if you have ObjectIds that are nested in arrays? What if you
want to support [MongoDB query operators](https://docs.mongodb.com/manual/reference/operator/query/)?

```javascript
// How to convert all these into ObjectIds? "Flip the table" or
// "long wall of if statements and for loops" are not valid options.
const data1 = {
  id: '586d5208616a940f835dac51',
  ids: ['586d5208616a940f835dac51', '586d521e616a940f835dac52'],
  nested: {
    id: '586d5208616a940f835dac51'
  }
}

const data2 = {
  id: {
    $in: ['586d5208616a940f835dac51', '586d521e616a940f835dac52']
  }
}
```

Archetype makes this easy: you just define 2 types, and archetype handles
all the hard recursion for you.

Casting to ObjectIds in Archetype
---------------------------------

Casting raw data into an ObjectId in Archetype is easy:

```javascript
const Archetype = require('archetype-js');
const {ObjectId} = require('mongodb');

const Type = new Archetype({
  id: { $type: ObjectId }, // $type can be any constructor
  ids: [ObjectId], // Can also use arrays
  nested: {
    id: { $type: ObjectId } // Archetype supports nested props
  }
}).compile('Type');

const v = new Type({
  id: '586d5208616a940f835dac51',
  ids: ['586d5208616a940f835dac51', '586d521e616a940f835dac52'],
  nested: {
    id: '586d5208616a940f835dac51'
  }
});

console.log(v.id.constructor.name); // ObjectID
console.log(v.ids[0].constructor.name); // ObjectID
console.log(v.nested.id.constructor.name); // ObjectID
```

The `new Type()` call will throw an exception if any of the ObjectIds are
invalid. This demonstrates the fundamental goal of Archetype: it's a framework
for composing types from other types. A single ObjectId is easy to understand,
Archetype lets you create complex types whose properties can be ObjectIds or
other types so you can handle complex objects as easily as you handle a single
ObjectId.

Casting Query Operators
-----------------------

Archetype is not limited to just MongoDB ObjectIds. Any archetype is a valid
`$type` for another archetype. Let's see this in action for casting MongoDB
query operators.

Suppose you have the following MongoDB document:

```javascript
{
  id: ObjectId('586d5208616a940f835dac51'),
  nested: {
    id: ObjectId('586d5208616a940f835dac51')
  }
}
```

We want Archetype to make it so the following queries will match the above document:

```javascript
{ id: '586d5208616a940f835dac51' }
{ id: { $eq: '586d5208616a940f835dac51' } }
{ id: { $in: ['586d5208616a940f835dac51'] } }
{ 'nested.id': '586d5208616a940f835dac51' }
{ 'nested.id': { $eq: '586d5208616a940f835dac51' } }
{ 'nested.id': { $in: ['586d5208616a940f835dac51'] } }
```

First, let's solve an easier problem: how do you coerce `{ $eq: '586d5208616a940f835dac51' }` and `{ $in: ['586d5208616a940f835dac51'] }` into ObjectIds? Here's an Archetype for that:

```javascript
const QueryId = new Archetype({
  $eq: ObjectId,
  $in: [ObjectId]
  // Can add other MongoDB query operators as well - $gte, $lte, $nin, etc.
}).compile('QueryId');
```

How about coercing `'586d5208616a940f835dac51'`? Archetypes are just [JavaScript classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes),
so you can build on top of them using [the `extends` keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends):

```javascript
const QueryIdBase = new Archetype({
  $eq: ObjectId,
  $in: [ObjectId]
}).compile('QueryId');

class QueryId extends QueryIdBase {
  constructor(v) {
    if (typeof v === 'object') {
      super(v);
    } else {
      super({ $eq: v });
    }
  }
}

// ObjectId
console.log(new QueryId('586d5208616a940f835dac51').$eq.constructor.name);
```

Now that you've solved the core problem, you can use Archetype to compose
this `QueryId` type to solve the original problem.

```javascript
const Query = new Archetype({
  id: QueryId,
  'nested.id': QueryId
}).compile('Query');
```

Now `Query` is a type you can use to coerce all your query properties into
ObjectIds correctly. Don't believe me? Here's a test.

```javascript
[
  { id: '586d5208616a940f835dac51' },
  { id: { $eq: '586d5208616a940f835dac51' } },
  { id: { $in: ['586d5208616a940f835dac51'] } },
  { 'nested.id': '586d5208616a940f835dac51' },
  { 'nested.id': { $eq: '586d5208616a940f835dac51' } },
  { 'nested.id': { $in: ['586d5208616a940f835dac51'] } },
].map(v => new Query(v)).forEach(v => check(v))

function check(v) {
  v = firstValue(firstValue(v));
  if (Array.isArray(v)) {
    v = v[0];
  }
  assert.equal(v.constructor.name, 'ObjectID');
}

function firstValue(v) {
  return v[Object.keys(v)[0]];
}
```

You can even create a function that generates a `QueryField` archetype for
any type:

```javascript
const QueryField = type => {
  const QueryFieldBase = new Archetype({
    $eq: type,
    $in: [type]
  }).compile('QueryField');

  class QueryField extends QueryFieldBase {
    constructor(v) {
      if (typeof v === 'object') {
        super(v);
      } else {
        super({ $eq: v });
      }
    }
  }

  return QueryField;
}

const Query = new Archetype({
  id: QueryField(ObjectId),
  'nested.id': QueryField(ObjectId)
}).compile('Query');
```

<img src="http://i.imgur.com/tr8ssaK.png" />

Conclusion
----------

Archetype is all about composing types in an elegant and intuitive way. You can
compose archetypes using nesting, extend archetypes using `extends`, and abstract out archetypes behind functions. Using these principles, you can build types in ways that
joi, JSON schema, and even [mongoose](https://www.npmjs.com/package/mongoose) simply cannot do, and minimize the amount of time you waste debugging runtime type issues.
