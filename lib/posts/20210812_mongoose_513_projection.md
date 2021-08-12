[Mongoose 5.13.0 was released on June 26, 2021](https://github.com/Automattic/mongoose/blob/master/History.md#5110--2020-11-30) and includes 17 new features, including 5 community contributions.
Mongoose 5.13 includes several noteworthy features - in this article I'll cover the `sanitizeProjection` option, which addresses a new potential security issue in MongoDB 4.4.

Projections in MongoDB 4.4
--------------------------

One of the major internal achievements in MongoDB 4.4 was unifying queries and aggregations.
As of MongoDB 4.4, the MongoDB server now handles `find(filter)` as a `aggregate([{ $match: filter }])` under the hood.
However, this has a somewhat surprising consequence: MongoDB 4.4 treats `filter(filter).select(fields)` as `aggregate([{ $match: filter }, { $project: fields }])`, _including_ the `$project` stage's support for aliases.

In other words, if you rely on Mongoose's `select` to hide certain fields, a malicious user may be able to access hidden fields if you allow user-specified query projections.
For example, suppose you use `select` to hide a `password` field.
The below query will replace the value of the user's `name` property with the value of the `password` property, even though `password` is excluded by default.

```javascript
const schema = new Schema({
  name: String,
  password: { type: String, select: false }
});
const UserModel = mongoose.model('User', schema);

const { _id } = await UserModel.create({
  name: 'my name',
  password: 'my secret'
});

const user = await UserModel.findById(_id).select({ name: '$password' });
user.name; // 'my secret' even though `password` is deselected!
```

For many apps, this isn't a problem.
However, this new behavior may be a problem if your app allows user-specified projections.
For example, the below Express endpoint is vulnerable because a malicious user can make an HTTP request with the query string `?name=$password` to get the user's password hash.

```javascript
app.get('/user/:id', function(req, res) {
  UserModel.findById(id).select(req.query.filter).then(
    doc => res.json(doc),
    err => res.status(500).json({ message: err.message })
  )
});
```

The `sanitizeProjection` Option
-----------------------------

Mongoose 5.13 includes a `sanitizeProjection` option that lets you opt in to Mongoose replacing any strings in projections with the number `1`.
This means there's no way to access a non-selected field from a query projection, so you can use user-specified data for projections without any manual validation.

```javascript
mongoose.set('sanitizeProjection', true);

const schema = new Schema({
  name: String,
  password: { type: String, select: false }
});
const UserModel = mongoose.model('User', schema);

const { _id } = await UserModel.create({
  name: 'my name',
  password: 'my secret'
});

const user = await UserModel.findById(_id).select({ name: '$password' });
user.name; // 'my name'
```

Like many other Mongoose options, you can configure `sanitizeProjection` globally, or on an individual query.
`sanitizeProjection` is disabled by default, but you can enable it for a single query as shown below.

```javascript
const user = await UserModel.findById(_id).select(projection).setOptions({
  sanitizeProjection: true
});
```

Moving On
---------

MongoDB 4.4 made major changes in how MongoDB handles query projections.
Before MongoDB 4.4, using user-specified projections in queries was safe because projections were highly limited.
As of MongoDB 4.4, projections can pull in other fields, including ones that are explicitly excluded.
The `sanitizeProjection` option can make your app more secure 
Custom casting is just one of 17 new features in Mongoose 5.13. Make sure you upgrade to take advantage of optimistic concurrency and all the other new features!

_Want to become your team's MongoDB expert? "Mastering Mongoose" distills 8 years of hard-earned lessons building Mongoose apps at scale into 153 pages. That means you can learn what you need to know to build production-ready full-stack apps with Node.js and MongoDB in a few days. <a href="https://masteringjs.io/ebooks/mastering-mongoose">Get your copy</a>!_

<a href="https://masteringjs.io/ebooks/mastering-mongoose" class="async-await-banner">
  <img src="https://masteringjs.io/ebooks/mastering-mongoose-horizontal.png">
</a>