One of the major challenges when working with [AWS Lambda](https://aws.amazon.com/lambda/) is bundling all your `node_modules` into [one zip file](https://mongoosejs.com/docs/lambda.html). Most simple examples rely on zipping up the entirety of `./node_modules`, but that doesn't scale well if you're looking to built a suite of Lambda functions as opposed to a single "Hello, World" example. In this article, I'll demonstrate the problem with zipping up Lambda functions yourself and show you how to use Webpack to bundle a Lambda function that connects to MongoDB.

Motivation
----------

For example, say you're building a couple simple API endpoints in Lambda using [Mongoose](https://mongoosejs.com/docs/lambda.html). You have a common file that handles connecting to the database called `db.js`:

```javascript
const config = require('./.config');
const mongoose = require('mongoose');

let conn = null;

module.exports = async function connect() {
  if (conn == null) {
    conn = await mongoose.connect(config.mongodb, {
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0 // and MongoDB driver buffering
    });

    conn.model('State', new mongoose.Schema({ uptime: Number }));
  }

  return conn;
};
```

Now, to create a Lambda bundle `lambda.zip` with a function that uses `db.js`, you need to `zip -r ./lambda.zip ./db.js ./fn.js ./node_modules`. Not bad. But presumably you also want to create some extra [Mongoose models](https://mongoosejs.com/docs/models.html), which involves adding another file to your `zip` command. In other words, you need to manually figure out the entire tree of `require()`-ed files and make sure they're all in your zip file, otherwise your Lambda function will crash.

Furthermore, zipping up all of `node_modules` is a bad idea. Once your project grows beyond the proof-of-concept phase and you want to add a testing framework like [Mocha](http://npmjs.com/package/mocha) or a linter like [eslint](https://www.npmjs.com/package/eslint), your `node_modules` will be filled with modules that your Lambda function doesn't need in production. `devDependencies` can help, but then you need to remember to `npm install --production` if you're building the bundle locally.

In other words, creating a zip bundle manually means you need to follow `require()` statements to make sure you get all the modules you need and none of the modules you don't. Sounds like a textbook use case for [Webpack](https://webpack.js.org/).

Bundling a Lambda Function with Webpack
---------------------------------------

Suppose you have a function that gets a document from the 'State' collection in MongoDB. If you're looking to try this code out, make sure you `npm install mongoose webpack webpack-cli` first.

```javascript
const db = require('./db');
const handler = require('./handler');

exports.handler = handler(getState);

async function getState() {
  const conn = await db();

  return conn.model('State').findOne();
}
```

The `handler.js` file contains a small wrapper function that wraps the `getState()` function in AWS' preferred function signature.

```javascript
module.exports = fn => function(event, context, callback) {
  // See https://www.mongodb.com/blog/post/serverless-development-with-nodejs-aws-lambda-mongodb-atlas
  context.callbackWaitsForEmptyEventLoop = false;

  fn().
    then(res => {
      callback(null, {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(res)
      });
      console.log('done');
    }).
    catch(error => callback(error));
};
```

There are 4 files to bundle, in addition to Mongoose and whatever `node_modules` Mongoose pulls in:

* `getState.js`: this is the entry point
* `handler.js`
* `db.js`
* `.config.js`: exports an object that contains sensitive credentials. You can also use [Lambda environment variables](https://docs.aws.amazon.com/lambda/latest/dg/env_variables.html).

The Webpack config file is shown below. This config is simpler than most Webpack configs because you don't need Babel or JSX or any other plugins for Lambda. Lambda now [supports Node.js 8](https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/), so you don't even need Lambda for [async/await](http://asyncawait.net/).

```javascript
module.exports = {
  entry: ['./getState.js'],
  target: 'node',
  output: {
    path: `${process.cwd()}/bin`,
    filename: 'getState.js',
    libraryTarget: 'umd'
  }
};
```

Lambda only accepts zip files as function uploads, so you still need to zip up `./bin/getState.js` after you run `./node_modules/.bin/webpack`.

```
zip -r ./bin/getState.zip ./bin/getState.js
```

Now, you're ready to upload the `getState()` function to Lambda. Go to the [AWS Lambda console](https://console.aws.amazon.com/lambda/home) and click "Create Function". Name the function `getState()` and make sure you select "Node.js 8.10" as the runtime for [async/await support](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js.html).

<img src="https://i.imgur.com/sf2H9hM.png" class="inline-image" />

Make sure you tweak the 'handler' input to point to the correct file path. If you zipped up `./bin/getState.js`, Lambda will create a `./bin` directory when it unzips.

<img src="https://i.imgur.com/8m3szk0.png" class="inline-image" />

After setting the 'handler', click 'Test' and you should see your function successfully execute.

<img src="https://i.imgur.com/zEqMLLB.png" class="inline-image" />

Moving On
---------

Serverless frameworks like AWS Lambda are becoming increasingly popular for API development. Lambda has numerous advantages over hosting an Express API on Amazon EC2.
Lambda's [free tier](https://aws.amazon.com/lambda/pricing/) gives you 1 million free requests per month, and doesn't expire after 12 months like EC2's. Lambda functions also are behind HTTPS by default, so you don't have to worry about [renewing your LetsEncrypt certificates](https://letsencrypt.org/). So next time you find yourself deploying a REST API, try tinkering with putting it on Lambda instead.

_Lambda recently added support for Node.js 8 and async/await. But, Lambda still doesn't support async functions as handlers. Want to know where Lambda's support for async functions breaks? Chapter 4 of [Mastering Async/Await](http://asyncawait.net/) explains the core principles for determining whether a given library or framework supports async/await, so get the ebook today!_

<a href="http://asyncawait.net/?utm_source=thecodebarbarian&utm_campaign=trailingbanner" class="async-await-banner"><img src="/images/asyncawait.png"/></a>
