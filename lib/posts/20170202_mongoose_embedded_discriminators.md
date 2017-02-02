The most +1'ed [feature](https://github.com/Automattic/mongoose/issues/1856) [request](https://github.com/Automattic/mongoose/issues/2723) for mongoose in 2016 was extending [discriminators](http://mongoosejs.com/docs/discriminators.html) to work with embedded documents. Discriminators are mongoose's built-in schema inheritance mechanism. For example, suppose you have a schema defining events:

```javascript
const eventSchema = new Schema({ message: String });
```

Naturally, an 'event' is a nebulous concept. Suppose you want to make some more
concrete events, like a `ClickedEvent` that contains the id of an element that
the user clicked and a `PurchasedEvent` that contains the id of the product
purchased. Discriminators let you do this:

```javascript
const eventSchema = new Schema({ message: String },
  { discriminatorKey: 'kind' });

const Event = mongoose.model('Event', eventSchema);

const ClickedEvent = Event.discriminator('Clicked', new Schema({
  element: {
    type: String,
    required: true
  }
}));

const PurchasedEvent = Event.discriminator('Purchased', new Schema({
  product: {
    type: String,
    required: true
  }
}));
```

Now `ClickedEvent` and `PurchasedEvent` are discriminators of `Event`. In other
words, `ClickedEvent` and `PurchasedEvent` are mongoose models that share the
'events' collection. When you save a new `ClickedEvent` instance, mongoose
will store it in the 'events' collection with the `kind` property set to 'Clicked'.
The `element` property is only required for `ClickedEvent` instances, and the
`product` property is only required for `PurchasedEvent` instances.
Calling `ClickedEvent.find()` is also equivalent to calling
`Event.find({ kind: 'Clicked' })`. You can read more about [discriminators in this article](http://thecodebarbarian.com/2015/07/24/guide-to-mongoose-discriminators).

One major limitation of discriminators in mongoose `~4.7` is you can only have
discriminators in top-level documents. For example, say instead of storing each
individual event in the database you store events in batches:

```javascript
const eventSchema = new Schema({ message: String },
  { discriminatorKey: 'kind', _id: false });

const batchSchema = new Schema({ events: [eventSchema] });
const Batch = mongoose.model('Batch', batchSchema);
```

In mongoose 4.7, there's no way to create a discriminator for the `events` array, because it's embedded in the top-level `Batch` model. Mongoose 4.8 adds the ability
to create discriminators on embedded arrays.

Discriminators for Document Arrays
----------------------------------

In mongoose `~4.8` you can define a discriminator by calling a document array's
`discriminator()` function:

```javascript
const eventSchema = new Schema({ message: String },
  { discriminatorKey: 'kind', _id: false });

const batchSchema = new Schema({ events: [eventSchema] });

// `batchSchema.path('events')` gets the mongoose `DocumentArray`
batchSchema.path('events').discriminator('Clicked', new Schema({
  element: {
    type: String,
    required: true
  }
}, { _id: false }));
batchSchema.path('events').discriminator('Purchased', new Schema({
  product: {
    type: String,
    required: true
  }
}, { _id: false }));

const Batch = mongoose.model('Batch', batchSchema);
```

Now you can now create event batches and mongoose will map `kind` properties
to the correct types:

```javascript
const batch = {
  events: [
    { kind: 'Clicked', element: 'Test' },
    { kind: 'Purchased', product: 22 }
  ]
};

Batch.create(batch).then(console.log);

// Output
/*
{ __v: 0,
  _id: 589389b84724655fca070f84,
  events:
   [ { element: 'Test', kind: 'Clicked' },
     { product: '22', kind: 'Purchased' } ] }
*/
```

One neat feature of discriminators is the ability to define [methods](http://mongoosejs.com/docs/guide.html#methods) on each discriminator. In the below example, you'll see you can create a different `displayName()` method for
`ClickedEvent` and `PurchasedEvent` instances.

```javascript
const clickedSchema = new Schema({
  element: {
    type: String,
    required: true
  }
}, { _id: false })

clickedSchema.methods.displayName = function() {
  return `${this.kind}:${this.element}`;
};

batchSchema.path('events').discriminator('Clicked', clickedSchema);

const purchasedSchema = new Schema({
  product: {
    type: String,
    required: true
  }
}, { _id: false });

purchasedSchema.methods.displayName = function() {
  return `${this.kind}:${this.product}`;
};

batchSchema.path('events').discriminator('Purchased', purchasedSchema);

const Batch = mongoose.model('Batch', batchSchema);

// Now actually use the schemas

const batch = {
  events: [
    { kind: 'Clicked', element: 'Test' },
    { kind: 'Purchased', product: 22 }
  ]
};

Batch.create(batch).
  then(batch => console.log(batch.events.map(e => e.displayName())));

// Output
/* [ 'Clicked:Test', 'Purchased:22' ] */
```

Moving On
---------

[Mongoose 4.8.0](https://github.com/Automattic/mongoose/blob/master/History.md#480--2017-01-28) includes 13 new features (like support for the [MongoDB 3.4 decimal type](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-decimal.html)) in addition to embedded array discriminators. It also has some major performance improvements for [documents with large embedded arrays](https://github.com/Automattic/mongoose/issues/4821#issuecomment-270033556). Make sure you upgrade and take advantage of these new improvements!
