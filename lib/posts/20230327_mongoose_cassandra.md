At [Cassandra Forward](https://www.cassandrasummit.org/cassandra-forward), we introduced [stargate-mongoose](https://npmjs.com/package/stargate-mongoose).
Stargate-mongoose is an alternative driver for Mongoose that lets you use Mongoose with [Cassandra](https://en.wikipedia.org/wiki/Apache_Cassandra) via DataStax's [Stargate JSON API project](https://github.com/stargate/jsonapi).
The news that we're working on Cassandra support for Mongoose caused a bigger stir than we anticipated; a lot of people are excited, some are concerned.
In this blog post, I'll explain what stargate-mongoose is all about and what this means for Mongoose.

Into the `void 0` with stargate-mongoose
------------------------

The idea is that you'll be able to plug in stargate-mongoose via [Mongoose's `setDriver()` function](https://mongoosejs.com/docs/api/mongoose.html#mongoose_Mongoose-setDriver), connect to Stargate, and then read to and write from Cassandra using Mongoose's existing API. 
For the most part, you'll be able to use your existing Mongoose code with _zero code changes_ besides adding `setDriver()` call and changing some config options.

```javascript
const mongoose = require('mongoose');

mongoose.set('autoCreate', true);
mongoose.set('autoIndex', false);

const { driver } = require('stargate-mongoose');
mongoose.setDriver(driver); // <-- Use stargate-mongoose driver

console.log('Connecting to', process.env.STARGATE_JSON_API_URL);
await mongoose.connect(process.env.STARGATE_JSON_API_URL, {
  username: process.env.STARGATE_JSON_USERNAME,
  password: process.env.STARGATE_JSON_PASSWORD,
  authUrl: process.env.STARGATE_JSON_AUTH_URL
});

// Read from and write to Cassandra via Stargate
const TestModel = mongoose.model(
  'Test',
  new mongoose.Schema({ answer: Number })
);

// Write a new document
const { _id } = await TestModel.create({ answer: 42 });
// Read the document back
const doc = await TestModel.findById(_id);
doc.answer; // 42
```

Eager to try it out for yourself?
There's a [stargate-mongoose-sample-apps repo](https://github.com/stargate/stargate-mongoose-sample-apps) that has a sample app based on [Mongoose's sample apps repo](https://github.com/mongoosejs/sample-apps).
The sample app is [netlify-functions-ecommerce](https://github.com/stargate/stargate-mongoose-sample-apps/tree/main/netlify-functions-ecommerce): an eCommerce store built on [Netlify](https://www.netlify.com/), including a serverless backend built with [Netlify functions](https://www.netlify.com/products/functions/)

For Cassandra developers, stargate-mongoose means you will have an effective bridge to the amazing capabilities of modern JavaScript.
With Mongoose and the greater JavaScript ecosystem, it will be much easier to be a _Full Stack Cassandra Developer_.
Check out the netlify-functions-ecommerce app for a taste of what's possible.
To ship that app to production, all you will need to do is sign up for a Netlify account and click a few buttons.
Netlify takes care of automatically redeploying your app on pushes to the `main` branch, SSL certificates, CDN, and API gateway for your serverless functions.

The Stargate JSON API is also coming to [DataStax Astra](https://astra.datastax.com/), DataStax's cloud Cassandra offering.
That means applications like netlify-functions-ecommerce can run fully in the cloud, so you can deploy new apps with a few clicks in a UI even without an existing Cassandra cluster.

While we've made a lot of progress, Stargate and stargate-mongoose are currently not ready for production usage.
DataStax Astra also doesn't currently support the Stargate JSON API.
As of this writing, you should only run the Stargate JSON API locally for testing out the possibilities.

What Does this Mean for Mongoose?
-----------------------------

First and foremost, I want to be as clear as possible on this point: Mongoose will continue to provide an excellent developer experience for MongoDB.
We have a great working relationship with MongoDB and plan on continuing to be a part of the MongoDB community.
As application developers, we plan on continuing to make heavy use of MongoDB in all of our apps.

We also have no plans to make Mongoose a multi-database ODM currently.
Stargate-mongoose is a separate project that plugs into Mongoose via Mongoose's established driver API, it is **not** a fork or a replica of Mongoose's API.

For Mongoose developers, the big news is that you'll be able to both build Mongoose apps on top of existing Cassandra deployments, and leverage Cassandra for workloads that are write and append heavy (messaging, analytics, etc.).
This should unlock new opportunities to build Mongoose applications that would not have been feasible before.

While Stargate is powerful and flexible, it is worth noting that you won't necessarily be able to access existing Cassandra tables via the Stargate JSON API.
The Stargate JSON API stores documents in Cassandra in a [format called "super shredding"](https://www.cassandrasummit.org/cassandra-forward).
So the Stargate JSON API won't be able to access tables that aren't in this format.

My hope is that MongoDB and Cassandra will be complementary tools for Mongoose developers.
Both databases have their respective merits, and have use cases that they're uniquely suited for.
Personally, as someone who develops apps using Mongoose, what I'm most excited for is the opportunity to use both side-by-side.

Cross-DB Populate
-----------------

I'd like to leave you with an example that I find particularly interesting.
Remember how Mongoose's [`populate()` function](https://mongoosejs.com/docs/populate.html) is an application-level join?
Well, there's nothing stopping you from using `populate()` to load documents from Cassandra, and join the results with data from MongoDB, all in one line of code.

```javascript
import mongoose from 'mongoose';
import { driver } from 'stargate-mongoose';

// 1. Connect to MongoDB
const mongodbInstance = new mongoose.Mongoose();
await mongodbInstance.connect('mongodb://127.0.0.1:27017/test');

// 2. Connect to Stargate
const stargateInstance = new mongoose.Mongoose();
stargateInstance.set('autoCreate', true);
stargateInstance.set('autoIndex', false);
stargateInstance.setDriver(driver);
await stargateInstance.connect('http://127.0.0.1:8080/v1/test', {
  username: 'cassandra',
  password: 'cassandra',
  authUrl: 'http://127.0.0.1:8081/v1/auth'
});

// 3. Create a User model in MongoDB
const userSchema = mongoose.Schema({
  name: String
});
const User = mongodbInstance.model('User', userSchema);

// 4. Create a Message model in Cassandra with a
// reference to the MongoDB Model
const messageSchema = new mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, ref: User },
  text: String
})
const Message = stargateInstance.model('Message', messageSchema);

// 5. Create a user and some messages:
const [user1, user2] = await User.create([
  { name: 'Alice' },
  { name: 'Bob' }
]);
await Message.create([
  { user: user1._id, text: 'Hello, World!' },
  { user: user2._id, text: 'This message is stored in Cassandra' }
]);

// 6. Load messages from Cassandra, pull associated users from MongoDB
const docs = await Message.find().populate('user');
console.log(docs); // Contains message text from Cassandra and user names from MongoDB
```

Moving On
---------

The stargate-mongoose project is a huge opportunity for both Mongoose developers and the Cassandra community.
Mongoose developers will be able to build applications on top of existing Cassandra deployments, and Cassandra developers will be able to easily leverage full stack JavaScript tools for building applications.
While stargate-mongoose is still early and not quite production ready yet, I encourage you to try out the [stargate-mongoose sample apps repo](https://github.com/stargate/stargate-mongoose-sample-apps) and let us know what you think!