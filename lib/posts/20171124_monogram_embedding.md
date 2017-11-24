[Monogram](http://thecodebarbarian.com/introducing-monogram-the-anti-odm-for-mongodb-nodejs) has a powerful middleware system that makes [cross-cutting concerns](https://en.wikipedia.org/wiki/Cross-cutting_concern) easy. One use case is [denormalization](https://www.mongodb.com/blog/post/6-rules-of-thumb-for-mongodb-schema-design-part-3), the practice of storing all or part of one document in another document. Denormalization is a powerful paradigm for both performance and data integrity. When done well, denormalization means you only need one query to fetch all necessary data, rather than using joins or `$lookup` stages that may require their own indexes.

The argument against denormalization is that [data may get out of sync](https://medium.com/just-meteor/why-we-don-t-denormalize-anymore-dc58b898765c). However, in many cases, data getting out of sync is a powerful data integrity feature rather than a bug. For example, at [Booster](https://www.trybooster.com/careers) two of our fundamental data structures are the `Request` and the `Vehicle`. A `Request` embeds the `Vehicle` the customer is requesting gas for.

Suppose a customer has been requesting gas from Booster for years and, thanks to all the time and money they saved by not sitting in line at gas stations during Bay Area rush hour, trades in their old Toyota Camry for a shiny new BMW X1. They update their vehicle in the app, but how should that affect old requests? Should all their requests from 2 years ago now say they were for a BMW X1? Some might argue this is a case for soft deletes: every time you update a vehicle, you "delete" the old one by setting an `isDeleted` property and create a new one. But soft deletes come with their own baggage, like having a lot more documents in one collection and thus incurring a bigger performance penalty on an index miss. In this case, embedding the vehicle in the request and only selectively updating it if the customer updates their vehicle is the way to go.

In this article, I'll talk about how to use [monogram](https://www.npmjs.com/package/monogram) to keep embedded documents selectively in sync.

Creating a New Document
-----------------------

When you create a new vehicle, there's no requests that point to it, so there's no need to do anything. But when you create a new request, you should always embed the vehicle. This is where monogram's middleware comes in.

Monogram's middleware is fundamentally [aspect-oriented](https://en.wikipedia.org/wiki/Aspect-oriented_programming). A monogram collection has the same API signatures as the [MongoDB driver](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html), but what monogram provides is a mechanism to hook into the stream of function calls, inspect an object representation of the function call, and potentially mutate the function call. As a client of monogram you shouldn't be aware of using monogram at all, you should write what looks like plain-old MongoDB driver code. But middleware lets you easily bolt on functionality to your MongoDB driver logic.

```javascript
const _ = require('lodash');
const monogram = require('monogram');

run().catch(error => console.error(error.stack));

async function run() {
  // db handle
  const db = await monogram.connect('mongodb://localhost:27017/test');

  // Attach some middleware
  embedVehicle(db, db.collection('Request'));

  const vehicle = { make: 'Toyota', model: 'Camry', year: 2007 };
  await db.collection('Vehicle').insertOne(vehicle);

  let request = { vehicleId: vehicle._id };
  await db.collection('Request').insertOne(request);

  // { _id: ..., make: 'Toyota', model: 'Camry', year: 2007 }
  console.log(request.vehicle);

  const otherVehicle = { make: 'BMW', model: 'X1', year: 2017 };
  await db.collection('Vehicle').insertOne(otherVehicle);

  // Set the vehicleId, so the `embedVehicle` middleware for
  // `findOneAndUpdate()` can take effect
  const update = { $set: { vehicleId: otherVehicle._id } };
  request = await db.collection('Request').
    findOneAndUpdate({ _id: request._id }, update, { returnOriginal: false }).
    then(res => res.value);

  // { _id: ..., make: 'BMW', model: 'X1', year: 2017 }
  console.log(request.vehicle);
}
```

Other than the mysterious `embedVehicle()` function above, the above code would still run even if you were just using the MongoDB driver directly. It wouldn't print out the same results though, because the `embedVehicle()` function needs to attach middleware to embed the vehicle. Below is the `embedVehicle()` function. It attaches two middleware functions that check for changes to the request's `vehicleId` property and attach a separate `vehicle` property.

```javascript
function embedVehicle(db, collection) {
  // `insertOne`, `insertMany`
  collection.pre(/^insert/, async function(action) {
    let docs = action.params[0];
    if (!Array.isArray(docs)) {
      docs = [docs];
    }

    // If `vehicleId` property not set, don't embed vehicle
    docs = docs.filter(doc => doc.vehicleId != null);

    for (const doc of docs) {
      doc.vehicle = await db.collection('Vehicle').findOne({ _id: doc.vehicleId });
    }
  });

  // `updateOne`, `updateMany`, `findOneAndUpdate`
  collection.pre(/update/i, async function(action) {
    // 2nd arg to `updateOne()`, etc. is always the update
    let update = action.params[1];
    if (_.has(update, '$unset.vehicleId')) {
      // If unsetting `vehicleId`, also unset `vehicle`
      update.$unset.vehicle = 1;
    } else if (_.has(update, '$set.vehicleId')) {
      // If setting `vehicleId`, also set `vehicle`
      update.$set.vehicle = await db.collection('Vehicle').findOne({
        _id: update.$set.vehicleId
      });
    }
  });
}
```

Updating an Existing Document
-----------------------------

The above covers keeping the `vehicle` property in sync when creating and updating a request. What about creating and updating a vehicle? The correct behavior in this case requires some nuance. If the customer updates their vehicle from a Toyota Camry to a BMW X1, that shouldn't update any requests they had from 2 years ago. But, on the other hand, if a customer fat-fingers their vehicle as a BMW X3 instead of a BMW X1, we should allow them to update it on their request so we know to the right car to look for. So, in other words, the `vehicle` should only be updated if the request is active, but not if the request was already completed.

The story is that a customer creates a request, changes their vehicle from a Toyota Camry to a BMW X1. Some time later, the request is marked as complete, and then the customer changes the year on their BMW X1. In the first case, the embedded `vehicle` should get updated because the request is still active. But once the request is complete, the embedded `vehicle` should not change. Below is this story in code.

```javascript
async function run() {
  const db = await monogram.connect('mongodb://localhost:27017/test');

  // Attach some middleware
  embedVehicle(db, db.collection('Request'));
  updateRequestVehicle(db.collection('Vehicle'), db.collection('Request'));

  const vehicle = { make: 'Toyota', model: 'Camry', year: 2007 };
  await db.collection('Vehicle').insertOne(vehicle);

  let request = { status: 'ACTIVE', vehicleId: vehicle._id };
  await db.collection('Request').insertOne(request);

  // { _id: ..., make: 'Toyota', model: 'Camry', year: 2007 }
  console.log(request.vehicle);

  // Update the vehicle, which will propagate down to the request
  await db.collection('Vehicle').updateOne({ _id: vehicle._id }, {
    $set: { make: 'BMW', model: 'X1', year: 2017 }
  });

  request = await db.collection('Request').findOne({ _id: request._id });
  // { _id: ..., make: 'BMW', model: 'X1', year: 2017 }
  console.log(request.vehicle);

  // now lets make the request completed, and change the vehicle again
  await db.collection('Request').updateOne({ _id: request._id }, {
    $set: { status: 'COMPLETE' }
  });
  await db.collection('Vehicle').updateOne({ _id: request._id }, {
    // Say the customer got a new BMW X1
    $set: { year: 2020 }
  });

  // Get the updated request
  request = await db.collection('Request').findOne({ _id: request._id });
  // Not updated, because the request was not active
  // { _id: ..., make: 'BMW', model: 'X1', year: 2017 }
  console.log(request.vehicle);
}
```

Below is the `updateRequestVehicle()` middleware. This middleware is very simplified and will not handle all vehicle update cases, but is enough for this simple example.

```javascript
function updateRequestVehicle(Vehicle, Request) {
  // `updateOne()`, `updateMany()`, `findOneAndUpdate()`
  Vehicle.pre(/update/i, async function(action) {
    const filter = action.params[0];
    const update = action.params[1];

    // Skip cases where not updating vehicle by id for simplicity
    if (filter._id == null) {
      return;
    }
    // Transform `{ $set: { make: 'BMW' } }` => `{ 'vehicle.make': 'BMW' }`
    const $set = Object.keys(update.$set).reduce(($set, key) => {
      $set[`vehicle.${key}`] = update.$set[key];
      return $set;
    }, {});
    await Request.updateMany({ status: 'ACTIVE', vehicleId: filter._id }, { $set });
  });
}
```

Moving On
---------

Monogram is a tool for advanced users of MongoDB to attach additional logic to their MongoDB driver code. Because monogram middleware always takes one parameter representing the function call as a POJO, its easy to build a rich data consistency layer underneath your business logic. In particular, monogram helps you build smarter data consistency models using denormalization, because keeping data in sync isn't always the right choice.
