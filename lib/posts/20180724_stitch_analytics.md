One of the most exciting features of [MongoDB Stitch](https://www.mongodb.com/cloud/stitch) is the ability to read and write
directly to your [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster from the browser. In other words, your static site or React app can write
event data directly to MongoDB without having to go through an intermediary
like [Segment](https://segment.com/). This lets you retain ownership of your
event data, as well as help cut costs. In this article, I'll show you how
to configure a MongoDB Stitch app for tracking events from the browser.

_Note that this article's code is just an example and not meant for production use._

Setting Up a Stitch App
-----------------------

This article assumes you already have a MongoDB Atlas cluster running. If you
don't, here's a [guide to getting started with Atlas](https://docs.atlas.mongodb.com/getting-started/).

Go to MongoDB Atlas and open the "Clusters" view. Under "Linked Stitch App", click
"Link Application" to get started creating a Stitch app.

<img class="inline-image" src="https://i.imgur.com/v14lsQs.png">

Name your Stitch app "analytics" and link it to your cluster. In this case,
the cluster is named "Cluster0".

<img class="inline-image" src="https://i.imgur.com/VvHfQwS.png">

Next, the Stitch UI will ask you to configure your app. Turn on "Anonymous Authentication" and create a collection `analytics.events`.

<img class="inline-image" src="https://i.imgur.com/Gw0UDcn.png">

In order to enable writing to your analytics collection, you need to modify
Stitch's default "Rules". Click on "Rules" in the left menu and edit the
"Owner" permission under the `analytics.events` collection. Empty out the
"Apply When" section to make the "Owner" permission never apply.

<img class="inline-image" src="https://i.imgur.com/cYmriyV.png">

Most events tracking tools separate out permissions for reading and writing,
so anyone can write to the database but reads are admin-only. In order to
disallow reads, you need to convert your rules to "Advanced Mode". Click on
"Convert to Advanced Mode" and ignore the scary warning that pops up.

<img class="inline-image" src="https://i.imgur.com/spM36Qm.png">

Modify your roles to look like what you see below. Now, your Stitch client can
write to the database but not read.

```
{
  "roles": [
    {
      "name": "owner",
      "apply_when": {},
      "insert": true,
      "delete": false,
      "read": false,
      "write": true,
      "fields": {},
      "additional_fields": {}
    }
  ],
  "filters": [],
  "schema": {
    "properties": {
      "_id": {
        "bsonType": "objectId"
      },
      "owner_id": {
        "bsonType": "string"
      }
    }
  }
}
```

Tracking Your First Event
-------------------------

Install the [mongodb-stitch-browser-sdk npm package](https://www.npmjs.com/package/mongodb-stitch-browser-sdk). MongoDB Stitch
recommends building the browser SDK with [webpack](https://www.npmjs.com/package/webpack), so make sure to install webpack
and webpack-cli. Also,
install [serve](https://www.npmjs.com/package/serve) for serving static HTML.

```
npm install mongodb-stitch-browser-sdk@4.x serve@9.x webpack@4.16.2 webpack-cli@3.1.0 --save
```

Next, create a trivial static site `index.html`. This page will load the
`main.js` file, which will be responsible for writing to MongoDB Atlas using
the Stitch SDK.

```
<html>
  <head>
    <title>My Site</title>

    <script type="text/javascript" src="dist/main.js"></script>
  </head>
  <body>
    <h1>My site</h1>
  </body>
</html>
```

Below is the content of `index.js`, the entry point for the compiled bundle
that webpack will produce. The below file just writes the current `pathname`
and the current time to the `analytics.events` collection.

```javascript
import { Stitch, AnonymousCredential, RemoteMongoClient } from 'mongodb-stitch-browser-sdk';

window.onload = main;

function main() {
  const client = Stitch.initializeDefaultAppClient('<your app id here>');
  client.auth.loginWithCredential(new AnonymousCredential()).
    then(() => {
      const db = client.getServiceClient(RemoteMongoClient.factory, 'mongodb-atlas').db('analytics');
      return db.collection('events').insertOne({
        path: window.location.pathname,
        time: new Date()
      });
    });
}
```

You also need a basic webpack config file. For the purposes of this example
you don't need any tools like [Babel](https://www.npmjs.com/package/babel-loader), but you'll need those if
you want your code to work with older browsers.

```javascript
module.exports = {
  entry: ['./index.js'],
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/i
    }]
  },
  target: 'web',
  mode: 'production'
};
```

Run `./node_modules/.bin/webpack` to compile the bundle and then run
`./node_modules/.bin/serve` to start a web server.

```
$ ./node_modules/.bin/webpack
Hash: 7905753ffa4597e049ea
Version: webpack 4.16.2
Time: 3080ms
Built at: 2018-07-24 15:36:53
  Asset     Size  Chunks             Chunk Names
main.js  223 KiB       0  [emitted]  main
Entrypoint main = main.js
 [3] (webpack)/buildin/global.js 489 bytes {0} [built]
 [8] multi ./index.js 28 bytes {0} [built]
[12] ./index.js + 103 modules 169 KiB {0} [built]
     | ./index.js 521 bytes [built]
     |     + 103 hidden modules
    + 10 hidden modules
$
$ ./node_modules/.bin/serve

 Serving!

 - Local:            http://localhost:5000
 - On Your Network:  http://127.0.1.1:5000
```

Now, if you visit `http://localhost:5000/`, you should see a `call` to
`stitch.mongodb.com` in your Chrome Network console that contains the id
of an inserted document. Congratulations, you just wrote a document into
your MongoDB Atlas cluster from your browser!

<img class="inline-image" src="https://i.imgur.com/GWSYg8q.png">

Crunching Some Numbers
----------------------

Now that you can write events data to MongoDB from the browser using
Stitch, let's write a common analytics query using the
[MongoDB aggregation framework](https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/).
Go back to your Atlas clusters page and click "Connect" to open up
instructions for how to connect to your Atlas cluster.

<img class="inline-image" src="https://i.imgur.com/LYScQtP.png">

Connect to your MongoDB Atlas cluster using the MongoDB shell, switch to the
'analytics' database using `use analytics;` and print out
a document.

```
mongo "mongodb+srv://cluster0-OMITTED.mongodb.net/test" --username OMITTED
MongoDB shell version v4.0.0
Enter password:
connecting to: mongodb+srv://cluster0-OMITTED.mongodb.net/test
PRIMARY>
PRIMARY> use analytics
switched to db analytics
PRIMARY> db.events.findOne()
{
	"_id" : ObjectId("5b5780681c9d4400000d6643"),
	"path" : "/",
	"time" : ISODate("2018-07-24T19:39:20.253Z")
}
PRIMARY>
```

In order to make this example more realistic, insert several more documents
into the collection using the below command:

```javascript
db.events.insertMany([
  { path: '/', time: ISODate('2018-07-24') },
  { path: '/', time: ISODate('2018-07-23') },
  { path: '/', time: ISODate('2017-07-24') }
]);
```

Let's use the aggregation framework to count up the number of hits per day. The
key is to group events by the day, month, and year they occurred using
[date aggregation operators](https://docs.mongodb.com/v3.4/reference/operator/aggregation-date/)

```javascript
db.events.aggregate([
  {
    $group: {
      _id: {
        // Pull day, month, year from the 'time' property of each doc
        day: { $dayOfMonth: '$time' },
        month: { $month: '$time' },
        year: { $year: '$time' }
      },
      num: {
        $sum: 1
      }
    }
  },
  {
    // Sort by date, descending
    $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
  }
]);
```

Running this aggregation query gets you how many events occurred on a given
day.

```
{ "_id" : { "day" : 24, "month" : 7, "year" : 2018 }, "num" : 2 }
{ "_id" : { "day" : 23, "month" : 7, "year" : 2018 }, "num" : 1 }
{ "_id" : { "day" : 24, "month" : 7, "year" : 2017 }, "num" : 1 }
```

Moving On
---------

MongoDB Stitch allows you to access your MongoDB Atlas cluster directly from
the browser, without needing to go through your own API. One potential use case
for this is analytics: instead of going through [Mixpanel](https://mixpanel.com/) or [Google Analytics](https://marketingplatform.google.com/about/) UI, you can
store your data in MongoDB and use the MongoDB aggregation framework or [MongoDB Charts](https://www.mongodb.com/products/charts) to analyze it. While it may
be a little early to close your Mixpanel account, MongoDB Stitch is worth
looking into if you're already a MongoDB power user.
