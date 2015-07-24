Discriminators are a powerful yet [unfortunately poorly documented](https://github.com/Automattic/mongoose/issues/2743)
feature of [mongoose](http://npmjs.org/package/mongoose). Discriminators
enable you to store documents with slightly different schemas in the same
collection and query them back in a consistent way. In this article, you'll
learn about how to use discriminators to store different types of events. You'll
also see how to use the aggregation framework to run rudimentary analyses.

Why Discriminators?
-------------------

Suppose you're using mongoose to track 2 different types of events; a user
clicking a link, and a user buying a product. Storing both types of event in
the same collection would be handy so you could use the
[MongoDB aggregation framework](http://thecodebarbarian.com/2015/06/26/crunching-nba-finals-history-with-mongodb)
for tasks like calculating how many users that clicked on a certain link bought
a certain product. However, these two event types have slightly different
schema requirements. A `ClickedLinkEvent` should track the URL the user clicked
on and the page they were on when they clicked it, but these fields would be
irrelevant for the `PurchasedEvent` schema. Instead, the `PurchasedEvent` schema
should track the product id and the final purchase price.

If you didn't know about discriminators, you might implement this as a single
schema using [mongoose's `Mixed` type](http://mongoosejs.com/docs/schematypes.html#mixed).
The `Mixed` type is mongoose's wildcard type - mongoose doesn't run casting or
validation on `Mixed` fields.

```javascript
var eventSchema = new mongoose.Schema({
  // The type of event
  kind: {
    type: String,
    required: true,
    enum: ['ClickedLink', 'Purchased']
  },
  // The time the event took place
  time: {
    type: Date,
    default: Date.now
  },
  /* Arbitrary data associated with the event.
   * `{}` corresponds to `Mixed` type in mongoose,
   * so no validation is run on this field */
  data: {}
});

var Event = mongoose.model('Event', eventSchema);
```

Unfortunately, using `Mixed` defeats the purpose of using mongoose in the
first place. If you're not going to validate the data at all, you should
consider just using the [MongoDB driver](https://github.com/mongodb/node-mongodb-native)
directly.

```javascript
var e = new Event({
  kind: 'ClickedLink',
  data: { badField: 'abc' }
});

// No error, 'badField' is perfectly valid
assert.ifError(e.validateSync());
```

The `discriminator()` Function
------------------------------

Suppose you created a general event model that looked like what you see below.

```javascript
var options = { discriminatorKey: 'kind' };

var eventSchema = new mongoose.Schema(
  {
    // The time the event took place
    time: {
      type: Date,
      default: Date.now
    }
  },
  options);
var Event = mongoose.model('Event', eventSchema);
```

The `discriminatorKey` option tells mongoose to add a path to the schema called
'kind' and use it to track which type of document this is. For instance, suppose
you declared two discriminators, `ClickedLinkEvent` and `PurchasedEvent`, as
shown below.

```javascript
// ClickedLinkEvent
var clickedEventSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true }
  },
  options);
var ClickedLinkEvent = Event.discriminator('ClickedLink',
  clickedEventSchema);

// PurchasedEvent
var purchasedSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId }
  },
  options);
var PurchasedEvent = Event.discriminator('Purchased',
  purchasedSchema);
```

The `ClickedLinkEvent` and `PurchasedEvent` discriminators work almost exactly
like regular mongoose models. For instance, you can create a new
`ClickedLinkEvent` and mongoose validation will ensure that the `to` field is
specified.

```javascript
var e = new ClickedLinkEvent({
  from: 'http://www.google.com'
});

console.log(e.kind); // Prints 'ClickedLink'
console.log(e.time); // Prints current time

var error = e.validateSync();
assert.ok(error);
// Prints ['to'] because no 'to' link specified
console.log(Object.keys(error.errors));
```

Note that the schema for the `ClickedLinkEvent` discriminator is the **union**
of `eventSchema` and `clickedEventSchema`. That is, the schema for
`ClickedLinkEvent` has:

* The discriminator field `kind`
* The `time` field from `eventSchema`
* The `from` and `to` from `clickedEventSchema`

However, `ClickedLinkEvent` is different from a conventional model. In
particular, documents that are instances of `ClickedLinkEvent` and
`PurchasedEvent` get stored in the 'events' collection. Querying with the
`Event` model can then find **all** documents that are of either type.

```javascript
ClickedLinkEvent.create({ from: 'abc', to: '123' }, function(err) {
  assert.ifError(err);
  var product = { product: '00000000000000000000000c' };
  PurchasedEvent.create(product, function(err) {
    assert.ifError(err);

    Event.find({}, function(error, events) {
      assert.ifError(error);

      // Got back both events!
      assert.equal(events.length, 2);
      assert.equal(events[0].kind, 'ClickedLink');
      assert.equal(events[1].kind, 'Purchased');

      // `from` field gets pulled in too
      assert.equal(events[0].from, 'abc');

      example2();
    });
  });
});
```

For instance, if you were to look at the 'events' collection in MongoDB
after running the above code, you'd see:

```
> db.events.find().pretty()
{
	"_id" : ObjectId("55afdeeb3b91d05562821ab4"),
	"from" : "abc",
	"to" : "123",
	"kind" : "ClickedLink",
	"time" : ISODate("2015-07-22T18:20:27.248Z"),
	"__v" : 0
}
{
	"_id" : ObjectId("55afdeeb3b91d05562821ab5"),
	"product" : ObjectId("00000000000000000000000c"),
	"kind" : "Purchased",
	"time" : ISODate("2015-07-22T18:20:27.378Z"),
	"__v" : 0
}
```

However, if you use the `ClickedLinkEvent` discriminator to query, you'll get
back just the documents that have `kind === 'ClickedLink'`.

```javascript
ClickedLinkEvent.find({}, function(error, events) {
  assert.ifError(error);
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'ClickedLink');

  assert.equal(events[0].from, 'abc');
});
```

Using the Aggregation Framework
-------------------------------

In mongoose, aggregations are discriminator-aware, so you can do tasks like
'find the most commonly purchased products' without even being aware of the
discriminator's existence.

```javascript
// Get back top 5 most purchased products
PurchasedEvent.aggregate([
  { $group: { _id: '$product', count: { $inc: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 5 }
], callback);
```

However, you have the additional ability to switch back and forth between
aggregating across all events versus aggregating across just `PurchasedEvent`
documents without any joins. For instance, suppose you wanted to compare the
number of users that purchased product `00000000000000000000000c` and the
number of users that visited the page `/product/00000000000000000000000c`. You
can achieve this with a single aggregation:

```javascript
Event.aggregate([
  {
    $match: {
      $or: [
        { kind: 'ClickedLink', to: '/product/00000000000000000000000c' },
        { kind: 'Purchased', product: mongoose.Types.ObjectId('00000000000000000000000c') }
      ]
    }
  },
  {
    $group: {
      _id: '$kind',
      count: { $sum: 1 }
    }
  }
]);
```

Conclusion
----------

Discriminators are a powerful mongoose feature that enable you to store
similar documents in the same collection with different schema constraints.
They are often handy in situations when you're tempted to just use a `Mixed`
type and bypass validation entirely. In particular, for applications like events
tracking and user permissions, discriminators can be indispensable.

*Like learning by watching? Check out
[this article's corresponding screencast](https://www.youtube.com/watch?v=xjjM06_mnls&feature=youtu.be).
This is my first attempt at screencasting, so feedback is always welcome in the
comments!*
