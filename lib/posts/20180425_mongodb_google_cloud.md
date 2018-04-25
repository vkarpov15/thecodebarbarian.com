Serverless architectures are becoming increasingly popular, and with good
reason. In my experience, container-based orchestration frameworks have a
steep learning curve and are overkill for most consumer-facing companies.
With [FaaS architectures](https://martinfowler.com/articles/serverless.html), like [AWS Lambda](https://www.mongodb.com/blog/post/serverless-development-with-nodejs-aws-lambda-mongodb-atlas) and [Azure Functions](http://thecodebarbarian.com/getting-started-with-azure-functions-and-mongodb.html), in theory the
only devops you need is bundling and uploading your app.

This article will walk you through setting up a Google Cloud Function in Node.js that connects to MongoDB. However, one major limitation of
stateless functions is the need to establish a separate database connection every time the stateless function runs, which incurs a major performance penalty.
Unfortunately, I haven't been able to figure out how to reuse a database connection
in Google Cloud Functions, the trick that works for [IBM Cloud](http://thecodebarbarian.com/getting-started-with-ibm-cloud-functions-and-mongodb.html), [Azure Functions](http://thecodebarbarian.com/getting-started-with-azure-functions-and-mongodb.html), and [AWS Lambda](https://www.mongodb.com/blog/post/serverless-development-with-nodejs-aws-lambda-mongodb-atlas) does **not** work for Google Cloud Functions.

"Hello, World" in Google Cloud Functions
----------------------------------------

Go to the [Google Cloud Functions landing page](https://cloud.google.com/functions/) and click "Try it free".

<img src="https://i.imgur.com/lSzijLZ.png">

Click on the hamburger icon in the upper left and find the "Cloud Functions" link in the sidebar, then click "Create function".

<img src="https://i.imgur.com/cVNm44O.png">

Name your function "hello-world" and leave the rest of the options in the
"Create function" form unchanged. Leave "Function to execute" as "helloWorld",
because that needs to match the name of the function your code exports. Below
is the code you should enter in, so you can confirm what version of Node.js
your function is running on.

```javascript
exports.helloWorld = (req, res) => {
  res.send('Hello from Node.js ' + process.version);
};
```

<img src="https://i.imgur.com/OpJymV1.png">

Click "Create" and wait for Google to deploy your cloud function.
Once your function is deployed, click on it to display the function's details.

<img src="https://i.imgur.com/sRMnHMY.png">

Click the "Trigger" tab to find your cloud function's URL.

<img src="https://i.imgur.com/r3rvHUy.png">

Copy the URL and use [curl](https://en.wikipedia.org/wiki/CURL) to run your cloud function.

```
$ curl https://us-central1-test21-201718.cloudfunctions.net/hello-world
Hello from Node.js v6.11.5
$  
```

Google Cloud Functions don't give you any control over what version of Node.js you run,
they run Node.js v6.11.5 currently. You can't use async/await natively on Google
Cloud Functions at the time of this writing.

Connecting to MongoDB Atlas
---------------------------

Click on the "Source" tab in the function details and hit the "Edit" button.
You'll notice there's 2 files in your source code, one of which is `package.json`.
Edit `package.json` to match the below code.

```
{
  "name": "sample-http",
  "version": "0.0.1",
  "dependencies": {
    "co": "4.6.0",
    "mongodb": "3.x"
  }
}
```

<img src="https://i.imgur.com/E4uBqOf.png">

Once you redeploy, Google Cloud will automatically install your npm dependencies
for you. Now, change your `index.js` to match the below code, replacing the `uri`
with your MongoDB Atlas URI.

```javascript
const co = require('co');
const mongodb = require('mongodb');

const uri = 'ATLAS_URI_HERE';

exports.helloWorld = (req, res) => {
  co(function*() {
    const client = yield mongodb.MongoClient.connect(uri);

    const docs = yield client.db('test').collection('tests').find().toArray();
    res.send('Result: ' + JSON.stringify(docs));
  }).catch(error => {
    res.send('Error: ' + error.toString());
  });
};
```

<img src="https://i.imgur.com/8udyX2v.png">

Click "Save" to deploy your function. Once it is deployed, you should be able
to curl your cloud function and get a document from MongoDB Atlas back.

```
$ curl https://us-central1-test21-201718.cloudfunctions.net/hello-world
Result: [{"_id":"5a7b7df69d07887542605888","name":"Hello!","__v":0}]
$
```

At this point, you would try re-using the database connection using the same
global state trick that works in AWS Lambda and other cloud function providers.

```javascript
const co = require('co');
const mongodb = require('mongodb');

const uri = 'ATLAS_URI_HERE';

// Other cloud providers would retain this, but not Google Cloud
let client = null;

exports.helloWorld = (req, res) => {
  co(function*() {
    const reusedConnection = client != null;
    if (client == null) {
      client = yield mongodb.MongoClient.connect(uri);   
    }

    const docs = yield client.db('test').collection('tests').find().toArray();
    res.send('Result: ' + JSON.stringify(docs) + ', Reused: ' + reusedConnection);
  }).catch(error => {
    res.send('Error: ' + error.toString());
  })
};
```

Unfortunately, the global state trick doesn't seem to work in Google Cloud.

```
$ curl https://us-central1-test21-201718.cloudfunctions.net/hello-world
Result: [{"_id":"5a7b7df69d07887542605888","name":"Hello!","__v":0}], Reused: false
$
$ curl https://us-central1-test21-201718.cloudfunctions.net/hello-world
Result: [{"_id":"5a7b7df69d07887542605888","name":"Hello!","__v":0}], Reused: false
$
```

Moving On
---------

FaaS is a powerful paradigm, but purely stateless functions suffer from performance
limitations when dealing with databases because establishing a new database
connection is costly. Most cloud function providers have a mechanism for
retaining database connections between function calls, but apparently Google Cloud
Functions does not. This severely limits Google Cloud Functions' ability to serve
as a replacement for a conventional web server.
