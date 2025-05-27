In 2023, we announced that we were working on [a Mongoose integration for DataStax's JSON API project](/were-working-on-cassandra-support-for-mongoose.html), then called stargate-mongoose, meaning you could use Mongoose to read from and write to [Apache Cassandra](https://cassandra.apache.org/_/index.html).
A few things have happened since then: JSON API was renamed [Data API](https://docs.datastax.com/en/astra-db-serverless/api-reference/dataapiclient.html), Data API gained support for [vector search](/rag-vector-search-with-astra-and-mongoose.html), and Data API has become the recommended interface for Astra's serverless databases.
Today, we're pleased to announce the 1.0.0 release of [`@datastax/astra-mongoose`](https://www.npmjs.com/package/@datastax/astra-mongoose), the next iteration of the stargate-mongoose project.

Astra-mongoose makes it easy to build apps that interact with DataStax Astra using Mongoose's familiar API. Whether you need to pull Astra data into a MongoDB-backed app or looking to simplify your Astra development experience, this release is for you.

Want to jump right in? Here are some resources to get started:
- [Sample apps repo](https://github.com/stargate/stargate-mongoose-sample-apps) – now fully migrated to `@datastax/astra-mongoose` ([PR #584](https://github.com/stargate/stargate-mongoose-sample-apps/pull/584))
- [Obsidian plugin](https://github.com/vkarpov15/obsidian-astra-semantic-search) – sync your Obsidian notes to Astra and perform semantic search with astra-mongoose using Astra's `$vectorize` (No additional AI API keys required)

## What's Changed in astra-mongoose

At a high level, there are 3 major changes in `@datastax/astra-mongoose`.

1. `@datastax/astra-mongoose` uses Astra's official Node.js/TypeScript driver [`@datastax/astra-db-ts`](https://www.npmjs.com/package/@datastax/astra-db-ts) to connect to Astra. Stargate-mongoose used its own method of connecting to Data API because `@datastax/astra-db-ts` didn't exist when stargate-mongoose was first written.
2. `@datastax/astra-mongoose` is designed to connect primarily to Data API running on DataStax Astra. Stargate-mongoose was geared towards connecting to self-hosted Data API instances.
3. Better support for Data API's tables API. More on that in the next section.

`@datastax/astra-mongoose` is not a full rewrite of stargate-mongoose. Instead, we simplified and refocused the existing stargate-mongoose code, including ripping out all the low-level connection logic that `@datastax/astra-db-ts` handles.
The result is a cleaner codebase and more reliable connectivity to Astra's services.
In addition, we improved TypeScript support and added better error handling to make development with Astra and Mongoose even smoother.

Also, `@datastax/astra-mongoose` does not mean Mongoose is now a multi-database ORM.
Mongoose is primarily built to work with MongoDB.
Astra-mongoose is a plugin that leverages Mongoose's driver API, a way to sub out the underlying database driver calls (like `find()`, `findOne()`, `updateOne()`, etc.) that has been part of Mongoose since 2012.
Mongoose's driver API also powers [Mongoose Playground](https://playground.mongoosejs.io/) and [Mongoose 9's upcoming browser library](https://github.com/mongoosejs/mongoose-browser).

One of the biggest updates in astra-mongoose is better support for Data API's tables.

## Using Tables With Astra-Mongoose

Stargate-mongoose was also designed primarily to interact with Data API's [_collections_](https://docs.datastax.com/en/astra-db-serverless/api-reference/collections.html).
Collections are designed to store unstructured data, allowing you to store arbitrary objects with no database schema, similar to MongoDB.
The downside was that, practically speaking, collections are only readable and writeable via Data API: the way collections store data in Cassandra isn't easily readable by except through Data API.
For example, if you inserted some data into a Cassandra table via a CQL shell, you couldn't read that data via the collections API.

Data API recently added support for [_tables_](https://docs.datastax.com/en/astra-db-serverless/api-reference/tables.html), which allow you to use Data API to read and write data from existing Cassandra tables.
This means you can use astra-mongoose to build applications on top of existing Cassandra data, even if that data wasn't originally inserted through Data API.

For example, take a look at [astra-mongoose's Discord bot sample app](https://github.com/stargate/stargate-mongoose-sample-apps/tree/main/discord-bot).
This app is a simple Discord bot that exposes a `/count` command which counts the number of documents in a collection (or table), and a `/createdocument` command which inserts a new document.

<img src="https://i.imgur.com/pjoS1UC.png">

By default, this app uses collections, but you can make it use tables by setting the environment variable `DATA_API_TABLES=true`.
The `DATA_API_TABLES` makes 2 changes:

1. Sets the `isTable` option on `mongoose.connect()` to tell astra-mongoose to use "tables mode"
2. Makes the `seed.js` script use `createTable()` instead of `createCollection()`.

Data API tables have a strict schema, so when creating a new table you either need to explicitly define the table schema, or use `tableDefinitionFromSchema()` to get a Data-API-compatible table schema from your Mongoose schema.

```javascript
const { createAstraUri } = require('@datastax/astra-mongoose');
const mongoose = require('./mongoose');

const uri = createAstraUri(
  process.env.ASTRA_API_ENDPOINT,
  process.env.ASTRA_APPLICATION_TOKEN,
  process.env.ASTRA_NAMESPACE
);
const jsonApiConnectOptions = {
  isTable: !!process.env.DATA_API_TABLES
};

// Connect in tables mode if `DATA_API_TABLES` is set
mongoose.connect(uri, jsonApiConnectOptions);
```

```javascript
const Bot = require('./models/bot');
const mongoose = require('./mongoose');
const { tableDefinitionFromSchema } = require('@datastax/astra-mongoose');

if (process.env.DATA_API_TABLES) {
  // Create a new table instead of a collection.
  // Data API tables **must** have a schema. `tableDefinitionFromSchema()` converts
  // Mongoose schemas into Data API table schemas.
  await mongoose.connection.createTable(
    Bot.collection.collectionName,
    tableDefinitionFromSchema(Bot.schema)
  );
} else {
  await Bot.createCollection();
}
```

With the above code, running the `/createdocument` command in Discord creates a new row in the `bots` table in Astra that you can then read from the CQL console.
The row has a MongoDB-style `_id` field and a numeric `__v` field, which are part of Mongoose's default schema configuration, but you can also see the `name` field that the Discord bot sets.
This table is a normal Cassandra table - you can query and manipulate it just like any other Cassandra table using standard CQL commands or other drivers.

<img src="https://i.imgur.com/mcmTv67.png">

## Moving On

We're excited to introduce the fully stable 1.0.0 release of `@datastax/astra-mongoose`.
Whether you're building a new application or integrating with an existing Cassandra database, astra-mongoose provides a familiar interface while giving you access to Astra's capabilities, including vector search for AI applications.

We'd love to hear about what you're building with astra-mongoose! Drop us a note on [GitHub](https://github.com/stargate/astra-mongoose-driver) or reach out on the [DataStax community forums](https://community.datastax.com/).
Try it out and let us know what you think!
