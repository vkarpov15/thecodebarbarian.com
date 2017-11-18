By virtue of the event loop, [scheduling tasks in Node.js](http://thecodebarbarian.com/2013/12/02/price-internationalization-with-the-mean-stack) is relatively straightforward. Plain old `setTimeout()` and `setInterval()` are sufficient for many basic use cases where you would normally use cron. However, things get more interesting when you need durable transactional scheduling, for use cases like:

* Send the customer an email reminder 3 days before an event is scheduled to take place
* Cancel a request 30 minutes after an issue was reported if the customer doesn't take any action
* Send a push notification an hour before a task is due

The problem with transactional scheduling is durability: if you just schedule with `setTimeout()`, you lose the job if your process restarts. Furthermore, with `setTimeout()` you can't assign a separate process to do the job. When you need persistence and IPC without having to set up a messaging solution (RabbitMQ, Kafka, etc.) the natural solution is to use your database. When your database is MongoDB, [agenda](https://www.npmjs.com/package/agenda) gives you a quick and easy solution for durable inter-process task scheduling.

Hello World With Agenda
-----------------------

Here's how you'd schedule a job with agenda in Node.js ([using async/await, so node >= 7.6.0](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html)).

```javascript
const Agenda = require('agenda');
const { MongoClient } = require('mongodb');

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017/agendatest');

  // Agenda will use the given mongodb connection to persist data, so jobs
  // will go in the "agendatest" database's "jobs" collection.
  const agenda = new Agenda().mongo(db, 'jobs');

  // Define a "job", an arbitrary function that agenda can execute
  agenda.define('hello', () => {
    console.log('Hello, World!');
    process.exit(0);
  });

  // Wait for agenda to connect. Should never fail since connection failures
  // should happen in the `await MongoClient.connect()` call.
  await new Promise(resolve => agenda.once('ready', resolve));

  // Schedule a job for 1 second from now and persist it to mongodb.
  // Jobs are uniquely defined by their name, in this case "hello"
  agenda.schedule(new Date(Date.now() + 1000), 'hello');
  agenda.start();
}

run().catch(error => {
  console.error(error);
  process.exit(-1);
});
```

Take a look at the `agendatest.jobs` collection in MongoDB after the above script has finished running, you should see a document that looks like what you see below.

```
$ mongo agendatest
dMongoDB shell version v3.4.1
connecting to: mongodb://127.0.0.1:27017/agendatest
MongoDB server version: 3.4.1
> db.jobs.findOne()
{
	"_id" : ObjectId("58dd6f70b8d1c221b9d16c12"),
	"name" : "hello",
	"data" : null,
	"type" : "normal",
	"priority" : 0,
	"nextRunAt" : null,
	"lastModifiedBy" : null,
	"lockedAt" : ISODate("2017-03-30T20:49:52.919Z"),
	"lastRunAt" : ISODate("2017-03-30T20:49:53.825Z")
}
>
```

Agenda created a new document that represents the job. Because the job lives in MongoDB, agenda can pick up where it left off even if you kill the script before the job runs. For example, let's change the job to run in 10 seconds and kill the process before the job runs.

```javascript
// Schedule a job for 1 second from now and persist it to mongodb.
// Jobs are uniquely defined by their name, in this case "hello"
agenda.schedule(new Date(Date.now() + 10000), 'hello');
agenda.start();
```

```
$ time node agenda.js
^C

real	0m1.036s
user	0m0.311s
sys	0m0.031s
$ sleep 10
$ time node agenda.js
Hello, World!

real	0m0.325s
user	0m0.317s
sys	0m0.024s
$
```

Separate Processes And Pub/Sub
------------------------------

You can have a single process that handles both scheduling and running your jobs, but agenda also makes it easy to have a producer process that schedules jobs, and a consumer process that runs jobs. You just need to ensure that both processes have an agenda instance that look at the same collection in MongoDB. Here's an example `producer.js`:

```javascript
const Agenda = require('agenda');
const { MongoClient } = require('mongodb');

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017/agendatest');
  const agenda = new Agenda().mongo(db, 'jobs');

  // Wait for agenda to connect. Should never fail since connection failures
  // should happen in the `await MongoClient.connect()` call.
  await new Promise(resolve => agenda.once('ready', resolve));

  // Schedule a job for 1 second from now and persist it to mongodb.
  // Jobs are uniquely defined by their name, in this case "hello"
  agenda.schedule(new Date(Date.now() + 1000), 'hello');
}

run().catch(error => {
  console.error(error);
  process.exit(-1);
});
```

Here's `consumer.js`:

```javascript
const Agenda = require('agenda');
const { MongoClient } = require('mongodb');

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017/agendatest');
  const agenda = new Agenda().mongo(db, 'jobs');

  // Define a "job", an arbitrary function that agenda can execute
  agenda.define('hello', () => {
    console.log('Hello, World!');
    process.exit(0);
  });

  // Wait for agenda to connect. Should never fail since connection failures
  // should happen in the `await MongoClient.connect()` call.
  await new Promise(resolve => agenda.once('ready', resolve));

  // `start()` is how you tell agenda to start processing jobs. If you just
  // want to produce (AKA schedule) jobs then don't call `start()`
  agenda.start();
}

run().catch(error => {
  console.error(error);
  process.exit(-1);
});
```

In `producer.js` you `schedule()` jobs to run. In `consumer.js`, you `define()` the function to run for a given job and `start()` the job processor.

You can also pass arbitrary parameters to your jobs. Here's a modified `producer.js` that schedules a job called 'print' which takes a parameter `message`.

```javascript
const Agenda = require('agenda');
const { MongoClient } = require('mongodb');

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017/agendatest');
  const agenda = new Agenda().mongo(db, 'jobs');

  await new Promise(resolve => agenda.once('ready', resolve));

  // The third parameter to `schedule()` is an object that can contain
  // arbitrary data. This data will be stored in the `data` property
  // in the document in mongodb
  agenda.schedule(new Date(Date.now() + 1000), 'print', {
    message: 'Hello!'
  });
}

run().catch(error => {
  console.error(error);
  process.exit(-1);
});
```

When you schedule this job, here's how it will look in MongoDB:

```
> db.jobs.findOne()
{
	"_id" : ObjectId("58dd7464187100248acfc231"),
	"name" : "print",
	"data" : {
		"message" : "Hello!"
	},
	"type" : "normal",
	"priority" : 0,
	"nextRunAt" : null,
	"lastModifiedBy" : null,
	"lockedAt" : ISODate("2017-03-30T21:11:04.172Z"),
	"lastRunAt" : ISODate("2017-03-30T21:11:04.180Z")
}
>
```

And here's the `consumer.js` whose 'print' job pulls the `message` parameter passed in to `schedule()`.

```javascript
const Agenda = require('agenda');
const { MongoClient } = require('mongodb');

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017/agendatest');
  const agenda = new Agenda().mongo(db, 'jobs');

  // `job` is an object representing the job that `producer.js` scheduled.
  // `job.attrs` contains the raw document that's stored in MongoDB, so
  // `job.attrs.data` is how you get the `data` that `producer.js` passes
  // to `schedule()`
  agenda.define('print', job => {
    console.log(job.attrs.data.message);
    process.exit(0);
  });

  await new Promise(resolve => agenda.once('ready', resolve));

  agenda.start();
}

run().catch(error => {
  console.error(error);
  process.exit(-1);
});
```

Cancelling and Rescheduling
---------------------------

Where agenda starts to break down is cancelling and rescheduling jobs. The issue is that, internally, agenda "locks" a job when it's close to running and that prevents cancellation and modification. I opened up [an issue on GitHub to track the inability to properly cancel jobs](https://github.com/rschmukler/agenda/issues/401). An agenda instance does have a `cancel()` function which is essentially equivalent to a `deleteMany()` on the 'jobs' collection, but that does not work as advertised. For example, the below example still prints "Hello, World!" despite the fact that the script calls `cancel()` and the job is no longer in the database.

```javascript
const Agenda = require('agenda');
const { MongoClient } = require('mongodb');

async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017/agendatest');
  const agenda = new Agenda().mongo(db, 'jobs');

  agenda.define('hello', () => {
    console.log('Hello, World!');
    process.exit(0);
  });

  await new Promise(resolve => agenda.once('ready', resolve));

  agenda.start();

  // Schedule a job for 5 seconds from now and `await` until it has been
  // persisted to MongoDB
  await new Promise((resolve, reject) => {
    agenda.schedule(new Date(Date.now() + 5000), 'hello', {}, promiseCallback(resolve, reject));
  });

  // Cancel the job, which deletes the document from the 'jobs' collection
  await new Promise((resolve, reject) => {
    agenda.cancel({ name: 'hello' }, promiseCallback(resolve, reject));
  });
}

run().catch(error => {
  console.error(error);
  process.exit(-1);
});

function promiseCallback(resolve, reject) {
  return function(error, res) {
    if (error) {
      return reject(error);
    }
    resolve(res);
  };
}
```

In order to actually cancel the job, your job needs to explicitly check MongoDB to make sure the job was not cancelled as shown below.

```javascript
async function run() {
  const db = await MongoClient.connect('mongodb://localhost:27017/agendatest');
  const agenda = new Agenda().mongo(db, 'jobs');

  agenda.define('hello', async function(job) {
    if (await checkCancelled(job)) {
      return;
    }
    console.log('Hello, World!');
    process.exit(0);
  });

  await new Promise(resolve => agenda.once('ready', resolve));

  agenda.start();

  // Schedule a job for 5 seconds from now and `await` until it has been
  // persisted to MongoDB
  await new Promise((resolve, reject) => {
    agenda.schedule(new Date(Date.now() + 5000), 'hello', {}, promiseCallback(resolve, reject));
  });

  // Cancel the job, which deletes the document from the 'jobs' collection
  await new Promise((resolve, reject) => {
    agenda.cancel({ name: 'hello' }, promiseCallback(resolve, reject));
  });

  // This function queries mongodb to make sure the job is was not deleted
  // after it was locked
  async function checkCancelled(job) {
    const count = await db.collection('jobs').count({ _id: job.attrs._id });
    return !(count > 0);
  }
}
```

For the same reason, rescheduling a job that's already been locked is a lost cause currently. If you want to reschedule a job, the best way to do so is to cancel the job using the above paradigm and then schedule a new one.

Moving On
---------

Agenda is a neat tool for transactional scheduling with MongoDB and Node.js. It even has [two](https://github.com/joeframbach/agendash) [GUIs](https://github.com/moudy/agenda-ui)! While agenda does have some problems with cancellation, it works for most basic cases and has some cool plugins. Check it out next time you're tempted to reach for RabbitMQ or Redis for transactional scheduling!

*One thing agenda does well is schema design: the format that agenda uses to store jobs in MongoDB is conducive to building effective indexes and scaling horizontally. Mastering MongoDB schema design is the key to getting the most out of MongoDB, so check out [Christian Kvalheim's Little MongoDB Schema Design Book](https://www.amazon.com/gp/product/1517394023/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=1517394023&linkCode=as2&tag=codebarbarian-20&linkId=9f984525eec28ec1008c344c1788f567) ([non-affiliate link](https://www.amazon.com/Little-Mongo-Schema-Design-Book/dp/1517394023)) to get up to speed. Christian wrote the MongoDB Node.js driver and leads the Node.js driver team at MongoDB, so he knows a thing or two about using MongoDB effectively.*
