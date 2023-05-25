Earlier in 2023 we announced that we're working on [Mongoose support for Apache Cassandra via DataStax's new JSON API](/were-working-on-cassandra-support-for-mongoose.html).
The big caveat with that announcement was that [stargate-mongoose](https://npmjs.com/package/stargate-mongoose) only supported running the [Stargate JSON API](https://github.com/stargate/jsonapi) locally.
We've been hard at work on adding support for [Astra](https://astra.datastax.com/), DataStax's cloud DBaaS for Cassandra, to stargate-mongoose.
This is a huge step forward for making stargate-mongoose production ready, because now you don't have to run Stargate yourself in order to use Mongoose with Cassandra.

Astra support is coming along nicely, and we're now ready to accept beta testers.
If you're interested in trying out Mongoose and JSON API on Astra, please send an email to <a href="mailto:json-preview@datastax.com">json-preview@datastax.com</a>. Please keep in mind that initially this will be available in only one region, and there is no SLA associated with your data. As we move out of Early Access and into General Availability, all Astra regions will be available, all Astra general SLAs will be applicable, and any specifics relative the stargate-mongoose and the JSON API will be communicated.

Connecting Mongoose to Astra
------------------------

Keep in mind that, right now, JSON API support in Astra is in a private preview.
In order to get access, you need to [create an Astra account](https://deploy-preview-1--amazing-cassata-75f094.netlify.app/) and email <a href="mailto:json-preview@datastax.com">json-preview@datastax.com</a>.
That being said, once you have access, log in to Astra and create a new database.

![image](https://user-images.githubusercontent.com/1620265/236689443-3a13c6fb-fe19-4f74-abc3-e9db6e6bd04f.png)

Once you have created a new database, create a new application token and gather the required credentials:

1. `ASTRA_DB_ID`
2. `ASTRA_DB_REGION`
3. `ASTRA_DB_KEYSPACE`
4. `ASTRA_DB_APPLICATION_TOKEN`

The "Configure your environment" section has all the required fields except the application token.

![image](https://user-images.githubusercontent.com/1620265/236690836-e98f5053-90fc-4f7c-8c25-8354b61620f7.png)

Combine these credentials into a connection string as follows:

```
https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1/${ASTRA_DB_KEYSPACE}?applicationToken=${ASTRA_DB_APPLICATION_TOKEN}
```

Or, you can use the below tool to generate the connection string.

<style>
  .connection-string-tool label {
    width: 280px;
    margin-right: 1em;
  }
  .connection-string-tool input[type="text"] {
    width: 500px;
  }
</style>
<div class="connection-string-tool">
  <div>
    <label>ASTRA_DB_ID</label>
    <input id="astra_db_id" type="text" placeholder="2597da05-9018-4566-a534-04338b75973b">
  </div>
  <div>
    <label>ASTRA_DB_REGION</label>
    <input id="astra_db_region" type="text" placeholder="eu-west-1">
  </div>
  <div>
    <label>ASTRA_DB_KEYSPACE</label>
    <input id="astra_db_keyspace" type="text" placeholder="mongoose">
  </div>
  <div>
    <label>ASTRA_DB_APPLICATION_TOKEN</label>
    <input id="astra_db_application_token" type="text" placeholder="AstraCS:mytoken">
  </div>
  <div>
    <label>OUTPUT</label>
    <input id="output" type="text" readonly="true">
  </div>
</div>
<script>
  let astraDbId = '2597da05-9018-4566-a534-04338b75973b';
  let astraDbRegion = 'eu-west-1';
  let astraDbKeyspace = 'mongoose';
  let astraDbApplicationToken = 'AstraCS:mytoken';
  let output = `https://${astraDbId}-${astraDbRegion}.apps.astra.datastax.com/api/json/v1/${astraDbKeyspace}?applicationToken=${astraDbApplicationToken}`;
  document.querySelector('#astra_db_id').addEventListener('keyup', function(ev) {
    astraDbId = ev.target.value || '2597da05-9018-4566-a534-04338b75973b';
    output = `https://${astraDbId}-${astraDbRegion}.apps.astra.datastax.com/api/json/v1/${astraDbKeyspace}?applicationToken=${astraDbApplicationToken}`;
    document.querySelector('#output').value = output;
  });
  document.querySelector('#astra_db_region').addEventListener('keyup', function(ev) {
    astraDbRegion = ev.target.value || 'eu-west-1';
    output = `https://${astraDbId}-${astraDbRegion}.apps.astra.datastax.com/api/json/v1/${astraDbKeyspace}?applicationToken=${astraDbApplicationToken}`;
    document.querySelector('#output').value = output;
  });
  document.querySelector('#astra_db_keyspace').addEventListener('keyup', function(ev) {
    astraDbKeyspace = ev.target.value || 'mongoose';
    output = `https://${astraDbId}-${astraDbRegion}.apps.astra.datastax.com/api/json/v1/${astraDbKeyspace}?applicationToken=${astraDbApplicationToken}`;
    document.querySelector('#output').value = output;
  });
  document.querySelector('#astra_db_application_token').addEventListener('keyup', function(ev) {
    astraDbApplicationToken = ev.target.value || 'AstraCS:mytoken';
    output = `https://${astraDbId}-${astraDbRegion}.apps.astra.datastax.com/api/json/v1/${astraDbKeyspace}?applicationToken=${astraDbApplicationToken}`;
    document.querySelector('#output').value = output;
  });
  document.querySelector('#output').addEventListener('click', ev => {
    ev.target.select();
    ev.target.setSelectionRange(0, 99999);
    document.execCommand('copy');
  });
  document.querySelector('#output').value = output;
</script>

Once you've created the connection string, you can connect to Astra with Mongoose by passing the connection string to `mongoose.connect()` as follows.
The `isAstra` and `createNamespaceOnConnect` options are required.

```javascript
const mongoose = require('mongoose');
const { driver } = require('stargate-mongoose');

mongoose.setDriver(driver);

mongoose.connect(astraConnectionString, {
  isAstra: true,
  createNamespaceOnConnect: false
});
```

Or you can try out one of our [sample apps](https://github.com/stargate/stargate-mongoose-sample-apps).
Just follow the instructions for connecting to Astra in the sample app's `README`, like the instructions in the [Netlify ecommerce sample app](https://github.com/stargate/stargate-mongoose-sample-apps/blob/main/netlify-functions-ecommerce/README.md).

Introducing create-stargate-mongoose-app
------------------------

In order to help you get started with Mongoose and Astra, we've built [create-stargate-mongoose-app](https://www.npmjs.com/package/create-stargate-mongoose-app).
This tool lets you create a new stargate-mongoose project based on one of our [sample apps](https://github.com/stargate/stargate-mongoose-sample-apps):

1. netlify-functions-ecommerce: an ecommerce store that runs on [Netlify](https://www.netlify.com/) and uses Stripe for payments
2. discord-bot: a basic discord bot that makes queries and inserts documents based on discord commands
3. typescript-express-reviews: a TypeScript and [Express](https://expressjs.com/) app that stores reviews for vehicles

For example, to create a `my-discord-bot` directory based on the discord-bot project, you can run the following command:

```
npx create-stargate-mongoose-app my-discord-bot --sample discord-bot
```

create-stargate-mongoose-app will copy the latest version of the discord bot sample app into the `my-discord-bot` directory and run `npm install` for you, so you'll have an Astra-backed discord bot ready to go.

Moving On
---------

Adding Astra support is a major step forward for stargate-mongoose, because now you can get a Cassandra-backed Mongoose app running with just a few clicks in a UI.
This means that users no longer have to run Stargate themselves to use Mongoose with Cassandra.
And as a Mongoose developer, this means you'll be able to leverage Cassandra's scalability and durability, particularly in write-heavy applications.
Want to try it out?
Astra support is currently in private preview, but you can request access by emailing <a href="mailto:json-preview@datastax.com">json-preview@datastax.com</a>.