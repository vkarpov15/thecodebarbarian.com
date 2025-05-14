In 2023, we announced that we were working on [a Mongoose integration for DataStax's JSON API project](/were-working-on-cassandra-support-for-mongoose.html) called stargate-mongoose, meaning you could use Mongoose to read from and write to [Apache Cassandra](https://cassandra.apache.org/_/index.html).
A few things have happened since then: JSON API was renamed [Data API](https://docs.datastax.com/en/astra-db-serverless/api-reference/dataapiclient.html), Data API gained support for [vector search](/rag-vector-search-with-astra-and-mongoose.html), and Data API has become the recommended way to interact with serverless databases in Astra.
Today, we're pleased to announce the 1.0.0 release of [`@datastax/astra-mongoose`](https://www.npmjs.com/package/@datastax/astra-mongoose), the next iteration of the stargate-mongoose project.

## What's Changed in astra-mongoose

At a high level, there are 3 major changes in `@datastax/astra-mongoose`.

1. `@datastax/astra-mongoose` uses Astra's official Node.js/TypeScript driver [`@datastax/astra-db-ts`](https://www.npmjs.com/package/@datastax/astra-db-ts) to connect to Astra. Stargate-mongoose used its own method of connecting to Data API because `@datastax/astra-db-ts` didn't exist when stargate-mongoose was first written.
2. `@datastax/astra-mongoose` is designed to connect primarily to Data API running on DataStax Astra. Stargate-mongoose was geared towards connecting to self-hosted Data API instances.
3. Better support for Data API's tables API. More on that in the next section.

`@datastax/astra-mongoose` is not a full rewrite of stargate-mongoose. Instead, we simplified and refocused the existing stargate-mongoose code, including ripping out all the low-level connection logic that `@datastax/astra-db-ts` handles.
The result is a cleaner codebase and more reliable connectivity to Astra's services.
In addition, we improved TypeScript support and added better error handling to make development with Astra and Mongoose even smoother.

## Using Tables With Astra-Mongoose

Stargate-mongoose was also designed primarily to interact with Data API's [_collections_](https://docs.datastax.com/en/astra-db-serverless/api-reference/collections.html).
Collections are designed to store unstructured data, allowing you to store arbitrary objects with no database schema, similar to MongoDB.
The downside was that, practically speaking, collections are only readable and writeable via Data API: the way collections store data in Cassandra isn't easily readable by except through Data API.
For example, if you inserted some data into a Cassandra table via a CQL shell, you couldn't read that data via the collections API.

Data API recently added support for [_tables_](https://docs.datastax.com/en/astra-db-serverless/api-reference/tables.html), which allow you to use Data API to read and write data from existing Cassandra tables.

## Moving On
