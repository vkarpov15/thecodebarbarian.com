In Mongoose 4.8 we added support for
[embedded discriminators in document arrays](http://thecodebarbarian.com/mongoose-4.8-embedded-discriminators).
Embedded discriminators gave you the ability to embed documents with
different schemas in a single array. For example, let's say you have a
`batchSchema` that contains a property `events` that represents a list
of events in the batch. Suppose you have 2 different types of events,
'Clicked' and 'Purchased'. The below code is how you create a document
array that can embed both 'Clicked' and 'Purchased' events:

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

// This is a valid batch, will store both `element` and `product`
// properties based on the value of `kind`
const batch = {
  events: [
    { kind: 'Clicked', element: 'Test' },
    { kind: 'Purchased', product: 22 }
  ]
};
```

This left an obvious gap in our functionality: what about [discriminators](http://mongoosejs.com/docs/discriminators.html) for [single nested subdocs](http://mongoosejs.com/docs/subdocs.html) as
opposed to document arrays?

Hello, Single Nested Discriminators
-----------------------------------

Let's adapt the `eventSchema` from above to use single nested subdocs.

```javascript
const eventDetailsSchema = new Schema({ message: String },
  { discriminatorKey: 'kind', _id: false });

const eventSchema = new Schema({
  message: String,
  createdAt: Date,
  props: eventDetailsSchema
});

// `batchSchema.path('props')` gets the schema path
eventSchema.path('props').discriminator('Clicked', new Schema({
  element: {
    type: String,
    required: true
  }
}, { _id: false }));
eventSchema.path('props').discriminator('Purchased', new Schema({
  product: {
    type: String,
    required: true
  }
}, { _id: false }));
```

The `eventSchema.path('props')` call gets the [mongoose SchemaType](http://mongoosejs.com/docs/schematypes.html) associated with
the path `props`. The `DocumentArray` and `Embedded` (single nested subdocs) SchemaTypes have a `discriminator()` function for embedded discriminators.

Here's how you can use `eventSchema` to create an event with a
`props` property that contains a 'Clicked' event:

```javascript
const Event = mongoose.model('Event', eventSchema);

const e = new Event({
  message: 'test',
  createdAt: new Date(),
  props: {
    kind: 'Clicked',
    element: '#hero-image'
  }
});

// Prints:
// { message: 'test',
//   createdAt: 2017-10-12T17:14:54.003Z,
//   props: { element: '#hero-image', kind: 'Clicked' },
//   _id: 59dfa30e3205ff0b689eb081 } undefined
console.log(e, e.validateSync());
```

A More Realistic Example
------------------------

Mongoose has had [discriminators for top-level documents](http://mongoosejs.com/docs/discriminators.html) for years,
so why are we adding discriminators for embedded docs? Because
[denormalization](https://www.mongodb.com/blog/post/6-rules-of-thumb-for-mongodb-schema-design-part-3) is a necessary part of building any
modern application. [3rd normal form](https://en.wikipedia.org/wiki/Third_normal_form) is a major obstacle to sane historical data analysis.

For example, lets say
you have a many-to-many relationship between orders and products.
Orders, once created, don't change. But if you're running an online
store, products change all the time. Products get added, deleted,
people go in and change the name or image, etc. If you obey 3NF, you
need soft deletes for products to prevent deleting a product that
is associated with an order. But if you want to analyze daily sales
of a product before/after you changed its name (or, if you're A/B testing different images for the product),
you're gonna have a bad time.

For this example, let's say you have a 'Product' model with 2
distinct types, 'Book' and 'Computer', that have slightly
different properties. This model will express 'Book' and 'Computer'
as top-level discriminators, so you will have a 'products' collection
that contains both books and computers.

```
const productSchema = new Schema({
  imageURL: String,
  name: String
}, { discriminatorKey: 'kind' });

const bookSchema = new Schema({
  author: String
});

const computerSchema = new Schema({
  ramGB: Number
});

// This is a top-level discriminator. Products will be saved
// in the 'products' collection, but have variable schema based
// on the value of the discriminator key (the `kind` property)
const Product = mongoose.model('Product', productSchema);
const Book = Product.discriminator('Book', bookSchema);
const Computer = Product.discriminator('Computer', computerSchema);
```

Now, let's say you have an 'Order' model that has a one-to-one
relationship with products. In other words, for the sake of this
example, assume that an order always has exactly one product.
You can do 3NF and have order only track
the id of the product, but, once again, that makes historical analysis
hard when products change over time. With single nested discriminators,
you can embed the same discriminator logic from the top-level
discriminator in the 'Order' model. Mongoose will even apply all
your [middleware](http://mongoosejs.com/docs/middleware.html) and [methods](http://mongoosejs.com/docs/guide.html#methods) from your discriminator schemas to the embedded subdoc.

```javascript
const orderSchema = new Schema({
  createdAt: Date,
  product: productSchema
});

orderSchema.path('product').discriminator('Book', bookSchema);
orderSchema.path('product').discriminator('Computer', computerSchema);

const Order = mongoose.model('Order', orderSchema);
```

Here's an example of using these two models. Note that, even if
the product changes, the product that the order embeds does not.

```javascript
run().catch(error => console.error(error));

async function run() {
  const laptop = await Computer.create({
    name: 'Asus Vivobook',
    ramGB: 32
  });

  const order = await Order.create({
    createdAt: new Date(),
    product: laptop
  });

  // Created order { __v: 0,
//   createdAt: 2017-10-12T17:58:04.691Z,
//   product:
//     { __v: 0,
//       name: 'Asus Vivobook',
//       ramGB: 32,
//       _id: 59dfad2c5be8450b8a8403ee,
//       kind: 'Computer' },
//  _id: 59dfad2c5be8450b8a8403ef }
console.log('Created order', order);

await Computer.updateOne({ _id: laptop._id }, { $set: { ramGB: 24 } });

// Even though the product changed, the order doesn't
console.log('Order after update', await Order.findById(order._id));
}
```

Moving On
---------

Single embedded discriminators mean that mongoose's discriminators API is finally fully fleshed out. This makes denormalizing sophisticated schemas easy. Single embedded discriminators are just one of [8 new features in mongoose 4.12](https://github.com/Automattic/mongoose/blob/master/History.md#4120--2017-10-02), so make sure you upgrade and take advantage of these powerful new features.
