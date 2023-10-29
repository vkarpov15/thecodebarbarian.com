[Retrieval augmented generation](https://www.promptingguide.ai/techniques/rag), or RAG for short, is a technique that injects additional relevant context into an LLM prompt in order to get better results.
For example, if you were to ask [ChatGPT](https://chat.openai.com/) to write a tweet about a new blog post describing how to work with [vector databases in Node.js](./getting-started-with-vector-databases-in-node-js.html), you might get the following output.

```
🚀 Exciting News for Node.js Developers! 🚀

Just dropped a 🔥NEW BLOG POST🔥 on mastering Vector Databases in Node.js. 📊

Learn how to supercharge your data-driven apps with speed and efficiency. Don't miss it! 🚀

Read the full post here: [Insert Blog Post Link] #NodeJS #VectorDatabases #WebDevelopment #DataDrivenApps 💻🔍
```

This tweet is reasonable, but a bit generic.
How about if we add an example of [a relevant tweet](https://twitter.com/DataStax/status/1717654884139303026) and ask ChatGPT to copy the tone and style using the following prompt?

```
Write a tweet promoting a new blog post about working with vector databases in Node.js

Write using the style and tone of the following tweet:

Ready to venture into the world of Generative AI?
Learn the ins and outs of infrastructure and select the right LLM for your project with this how-to guide.
```

Here's the result:

```
Ready to dive into the world of vector databases in Node.js?
Discover the secrets to optimizing your data handling and supercharging your apps!
Check out our latest blog post for the ultimate how-to guide.
```

The idea of RAG is to use a [vector database](./getting-started-with-vector-databases-in-node-js.html) to find relevant examples to the user's prompt, to help guide the LLM to a better result.
In this blog post, I'll show how to use [Astra's vector search](https://docs.datastax.com/en/astra-serverless/docs/vector-search/overview.html) with [Mongoose](https://mongoosejs.com/) to build a RAG chatbot that answers JavaScript programming questions using [Mastering JS' articles](https://masteringjs.io/) for context.

You can see the [full source code for the Mastering JS chatbot here](https://github.com/mastering-js/masteringjs-backend/blob/e760d30d32eb022ad47aafd7ffcc6ee16af9ae76/chatbot.js).
You can also access a [live version of the Mastering JS chatbot here](https://deploy-preview-335--masteringjs.netlify.app/tutorials/mocha/aftereach?show-chatbot=true), just be aware that this chatbot is limited to 100 queries per hour to prevent abuse.

Getting Started with Astra and Mongoose
--------------------------------

Astra's new vector search capabilities are integrated into Astra's JSON API, which means [you can use Mongoose queries to do vector search in Astra](./introducing-private-preview-for-stargate-mongoose-astra.html).
To get started, install Mongoose and [stargate-mongoose](https://www.npmjs.com/package/stargate-mongoose).

```
npm install mongoose stargate-mongoose
```

Next, deploy a new vector database on [Astra](https://astra.datastax.com/).

<img src="https://i.imgur.com/3bkaFFt.png" style="width: 50%; border: 1px solid #ddd">

Click into your new Astra vector database, click "Connect", and find "Connect with the JSON API".
You should see the following instructions:

<img src="https://i.imgur.com/wN8GJkl.png" style="border: 1px solid #ddd">

Click "Generate Configuration" to get credentials for your Astra vector database.
You will get a `ASTRA_DB_ID`, `ASTRA_DB_REGION`, `ASTRA_DB_KEYSPACE`, and `ASTRA_DB_APPLICATION_TOKEN`.
Copy these values into my [Astra connection string generation tool](./introducing-private-preview-for-stargate-mongoose-astra.html#connecting-mongoose-to-astra) to get your Astra connection string.
It should look like the following:

```
https://3418a8ac-OMITTED-us-east-2.apps.astra.datastax.com/api/json/v1/test?applicationToken=AstraCS:OMITTED
```

With an Astra connection string, you're now ready to connect to Astra and start querying documents.
Import Mongoose and stargate-mongoose as follows:

```javascript
const mongoose = require('mongoose');

mongoose.set('autoCreate', false);
mongoose.set('autoIndex', false);

const { driver } = require('stargate-mongoose');
mongoose.setDriver(driver); // <-- Use stargate-mongoose driver
```

Then, connect to Astra using `mongoose.connect()`, and create a new collection `tests` that has vector search enabled as follows.

```javascript
await mongoose.connect(process.env.ASTRA_URI, { isAstra: true });

// Clean up any existing collection that may conflict
await mongoose.connection.dropCollection('tests');
// Create a new collection with vector search enabled
await mongoose.connection.createCollection('tests', {
  vector: {
    function: 'cosine',
    size: 2
  }
});
```

Create a new [Mongoose model](https://mongoosejs.com/docs/models.html) with a `$vector` property.
The `$vector` property is an array of numbers that Astra uses to store the document's vector for vector search.

```javascript
const schema = new mongoose.Schema({
  $vector: [Number],
  name: String
});
const TestModel = mongoose.model('Test', schema, 'tests');
await TestModel.create({ name: 'Test 1', $vector: [0, 1] });
await TestModel.create({ name: 'Test 2', $vector: [0, -1] });
```

With JSON API, vector search is represented as a [Mongoose query](https://mongoosejs.com/docs/queries.html) with a special `sort()` parameter on `$vector`.
The sort parameter to `$vector` tells Astra which vector to find documents closest to.
The following example shows how to query for which documents are closest to the vector `[0.1, -0.9]` followed by the documents closest to `[0.1, 0.9]`:

```javascript
let docs = await TestModel.find()
  .sort({ $vector: { $meta: [0.1, -0.9] } });
// "Test 2", "Test 1"
console.log(docs.map(doc => doc.name));

docs = await TestModel.find()
  .sort({ $vector: { $meta: [0.1, 0.9] } });
// "Test 1", "Test 2"
console.log(docs.map(doc => doc.name));
```

Importing Mastering JS' Articles
-------------------------------

Retrieval Augmented Generation
------------------------------

Moving On
---------