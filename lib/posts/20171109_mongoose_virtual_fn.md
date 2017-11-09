[Mongoose 4.13](https://github.com/Automattic/mongoose/blob/master/History.md#4130--2017-11-02) was released last week. As usual, its packed with powerful new features. The most exciting new feature is the ability to set `localField`, `foreignField`, and `ref` dynamically for [virtual populate](http://mongoosejs.com/docs/populate.html#populate-virtuals). The syntax for virtual populate's dynamic properties is slightly different than the one for [conventional populate](http://mongoosejs.com/docs/populate.html#dynamic-ref), but we think this new syntax is much more powerful.

Introducing Dynamic Virtual Populate Properties
-----------------------------------------------

Virtual populate creates a [virtual property](http://mongoosejs.com/docs/guide.html#virtuals) (one that is **not** stored in the database) that can look up documents from other collections. There are 4 options for configuring virtual populate, in addition to the name of the virtual: `ref`, `localField`, `foreignField`, and `justOne`.

```javascript
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/test', { useMongoClient: true });

var PersonSchema = new mongoose.Schema({
  name: String,
  band: String
});

var BandSchema = new mongoose.Schema({
  name: String
}, { toObject: { virtuals: true } });
BandSchema.virtual('members', {
  ref: 'Person', // The model to use
  localField: 'name', // Find people where `localField`
  foreignField: 'band', // is equal to `foreignField`
  // If `justOne` is true, 'members' will be a single doc as opposed to
  // an array. `justOne` is false by default.
  justOne: false
});

var Person = mongoose.model('Person', PersonSchema);
var Band = mongoose.model('Band', BandSchema);
```

You can call `.populate('members')` to find documents in the 'Person' model's collection whose `band` property equals the band's `name` property. For example:

```javascript
run().catch(error => console.error(error));

async function run() {
  await mongoose.connection.dropDatabase();

  await Person.create([
    { name: 'Axl Rose', band: 'Guns N\' Roses' },
    { name: 'Slash', band: 'Guns N\' Roses' },
    { name: 'Vince Neil', band: 'Motley Crue' },
    { name: 'Nikki Sixx', band: 'Motley Crue' }
  ])

  await Band.create([
    { name: 'Guns N\' Roses' },
    { name: 'Motley Crue' }
  ])

  const docs = await Band.find().sort({ name: 1 }).populate('members');
  // { _id: 5a049172eff7d3338724f40a,
  //   name: 'Guns N\' Roses',
  //   __v: 0,
  //   members:
  //     [ { _id: 5a049172eff7d3338724f407,
  //         name: 'Slash',
  //         band: 'Guns N\' Roses',
  //         __v: 0 },
  //        { _id: 5a049172eff7d3338724f406,
  //          name: 'Axl Rose',
  //          band: 'Guns N\' Roses',
  //          __v: 0 } ],
  //   id: '5a049172eff7d3338724f40a' }
  console.log(docs[0]);
  // { _id: 5a049172eff7d3338724f40b,
  //   name: 'Motley Crue',
  //   __v: 0,
  //   members:
  //     [ { _id: 5a049172eff7d3338724f409,
  //         name: 'Nikki Sixx',
  //         band: 'Motley Crue',
  //         __v: 0 },
  //       { _id: 5a049172eff7d3338724f408,
  //         name: 'Vince Neil',
  //         band: 'Motley Crue',
  //         __v: 0 } ],
  //   id: '5a049172eff7d3338724f40b' }
  console.log(docs[1]);
}
```

Before mongoose 4.13, `localField`, `foreignField`, and `ref` had to be strings, so they couldn't change based on the document. In mongoose 4.13 you can still set these properties to strings, but you can also set them to _functions_ that take the current document as a parameter. This means you can determine what `localField`, `foreignField`, and `ref` are depending on the doc being populated.

For example, lets say you had 2 models, 'Person' and 'Organization', and people and organizations can send messages to each other represented by a 'Message' model. Suppose you wanted `from` and `to` virtuals that you could populate to the correct sender and recipient for the message. Before mongoose 4.13, this would not be possible with virtual populate because people and organizations are in separate collections. However, now that `ref` can be dynamic, you can do this:

```javascript
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/test', { useMongoClient: true });

var PersonSchema = new mongoose.Schema({
  name: String
});

var OrganizationSchema = new mongoose.Schema({
  name: String
});

var MessageSchema = new mongoose.Schema({
  fromModel: String,
  fromId: mongoose.Schema.Types.ObjectId,
  toModel: String,
  toId: mongoose.Schema.Types.ObjectId
}, { toObject: { virtuals: true } });

MessageSchema.virtual('from', {
  ref: doc => doc.fromModel, // The model to use, conditional on the doc
  localField: 'fromId', // Find people or organizations where `localField`
  foreignField: '_id', // is equal to `foreignField`
  justOne: true // and return only one
});

MessageSchema.virtual('to', {
  ref: doc => doc.toModel, // The model to use, conditional on the doc
  localField: 'toId', // Find people or organizations where `localField`
  foreignField: '_id', // is equal to `foreignField`
  justOne: true // and return only one
});

var Person = mongoose.model('Person', PersonSchema);
var Organization = mongoose.model('Organization', OrganizationSchema);
var Message = mongoose.model('Message', BandSchema);
```

Here's how using these models looks. Mongoose abstracts out the interaction with `fromModel` and `toModel`. So all you need to do is `.populate('from to')` and you get the correct organization or person, depending on the value of `fromModel` and `toModel`.

```javascript
run().catch(error => console.error(error));

async function run() {
  await mongoose.connection.dropDatabase();

  const [alice, bob] = await Person.create([{ name: 'Alice' }, { name: 'Bob' }]);
  const organization = await Organization.create({ name: 'C Corp' });

  const messages = await Message.create([
    {
      fromModel: 'Person',
      fromId: alice._id,
      toModel: 'Person',
      toId: bob._id,
      body: 'Hi Bob'
    },
    {
      fromModel: 'Organization',
      fromId: organization._id,
      toModel: 'Person',
      toId: bob._id,
      body: 'Alice has sent you a message, accept?'
    },
    {
      fromModel: 'Person',
      fromId: bob._id,
      toModel: 'Organization',
      toId: organization._id,
      body: 'Yes'
    }
  ]);

  const docs = await Message.find().sort({ _id: 1 }).populate('from to');
  // { _id: 5a049618a62ecf3611b55a6c, name: 'Alice', __v: 0 }
  console.log(docs[0].from);
  // { _id: 5a049618a62ecf3611b55a6d, name: 'Bob', __v: 0 }
  console.log(docs[0].to);
  // { _id: 5a049618a62ecf3611b55a6e, name: 'C Corp', __v: 0 }
  console.log(docs[1].from);
  // { _id: 5a049618a62ecf3611b55a6d, name: 'Bob', __v: 0 }
  console.log(docs[1].to);
  // { _id: 5a049618a62ecf3611b55a6d, name: 'Bob', __v: 0 }
  console.log(docs[2].from);
  // { _id: 5a049618a62ecf3611b55a6e, name: 'C Corp', __v: 0 }
  console.log(docs[2].to);
}
```

Dynamic `localField` and `foreignField`
---------------------------------------

Dynamic refs are supported in conventional populate as well as virtual populate, but the limitation of conventional populate was always the fact that the fields were fixed. Conventional populate is like virtual populate, except `foreignField` must always be `_id`. The primary reason for adding virtual populate was letting you specify `localField` and `foreignField`, and mongoose 4.13 brings that promise to fruition by making `localField` and `foreignField` fully dynamic on a per-document basis.

For example, let's say you had an 'Assignment' model that models assigning a task to either a 'User' or an 'Admin'. If an admin is assigned, that overwrites the user's assignment, regardless of whether a user is also assigned. Here's how you would create the `assigned` virtual:

```javascript
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/test', { useMongoClient: true });

var PersonSchema = new mongoose.Schema({
  name: String
});

var AdminSchema = new mongoose.Schema({
  name: String
});

var AssignmentSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  adminId: mongoose.Schema.Types.ObjectId
}, { toObject: { virtuals: true } });

AssignmentSchema.virtual('assigned', {
  ref: doc => doc.adminId ? 'Admin' : 'User',
  localField: doc => doc.adminId ? 'adminId' : 'userId',
  foreignField: '_id',
  justOne: true
});

var User = mongoose.model('User', UserSchema);
var Admin = mongoose.model('Admin', AdminSchema);
var Assignment = mongoose.model('Assignment', AssignmentSchema);
```

Here's an example of these models in action:

```javascript
run().catch(error => console.error(error));

async function run() {
  await mongoose.connection.dropDatabase();

  const user = await User.create({ name: 'Homer Simpson' });
  const admin = await Admin.create({ name: 'Mr. Burns' });

  await Assignment.create([
    { userId: user._id },
    { userId: user._id, adminId: admin._id }
  ]);

  const docs = await Assignment.find().sort({ _id: 1 }).populate('assigned');

  // [ { _id: 5a049d28425f8b3a90dfd892, name: 'Homer Simpson', __v: 0 },
  //   { _id: 5a049d28425f8b3a90dfd893, name: 'Mr. Burns', __v: 0 } ]
  console.log(docs.map(doc => doc.assigned));
}
```

Moving On
---------

Virtual populate's new support for dynamic per-document `ref`, `localField`, and `foreignField` opens up a lot of new and powerful design patterns. I'm really excited to see what [plugins](http://mongoosejs.com/docs/plugins.html) people come up with. Mongoose 4.13 has [9 other new features](https://github.com/Automattic/mongoose/blob/master/History.md#4130--2017-11-02), including middleware for `.aggregate()`, so make sure you upgrade and take advantage of the new functionality! 
