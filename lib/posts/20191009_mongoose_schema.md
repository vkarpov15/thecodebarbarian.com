A common gotcha with [Mongoose populate](https://mongoosejs.com/docs/populate.html)
is that you can't filter by fields in the foreign collection. For example, suppose
you have 2 models: `Book` and `Author`, and you want to filter books by the author's
name.

```javascript
// 2 models: Book and Author
const Book = mongoose.model('Book', Schema({
  title: String,
  author: {
    type: mongoose.ObjectId,
    ref: 'Author'
  }
}));
const Author = mongoose.model('Author', Schema({
  name: String
}));

// Create books and authors
const [author1, author2] = await Author.create([
  { name: 'Michael Crichton' },
  { name: 'Ian Fleming' }
]);
const books = await Book.create([
  { title: 'Jurassic Park', author: author1._id },
  { title: 'Casino Royale', author: author2._id }
]);

// Populate books and filter by author name.
const books = Book.find().populate({
  path: 'author',
  match: { name: 'Ian Fleming' }
});

books.length; // 2
books[0].author; // null
books[1].author; // { name: 'Ian Fleming' }
```

In the above example, even though the [populate `match`](http://thecodebarbarian.com/mongoose-5-5-static-hooks-and-populate-match-functions#populate-match-function)
filters based on the author's name, Mongoose still returns all the books, including
those whose `author.name` doesn't match. If `author.name` isn't `'Ian Fleming'`, the
book's `author` property will be `null`.

That's because, under the hood, Mongoose translates `Book.find().populate('author')`
into 2 queries:

1. `const books = await Book.find({})`
2. `Author.find({ _id: { $in: books.map(b => b.author) }, name: 'Ian Fleming' })`

So `populate()` finds all books first, and then finds the corresponding authors.

Store What You Query For
------------------------

If you need to filter books by the author's name in a performant way, the right way
is to store the author's name in the book document:

```javascript
// 2 models: Book and Author
const Book = mongoose.model('Book', Schema({
  title: String,
  author: {
    type: mongoose.ObjectId,
    ref: 'Author'
  },
  authorName: String
}));

const authorSchema = Schema({ name: String });
// Add middleware to update the dereferenced `authorName`
authorSchema.pre('save', async function() {
  if (this.isModified('name')) {
    await Book.updateMany({ authorId: this.author }, { authorName: this.name });
  }
});
const Author = mongoose.model('Author', authorSchema);
```

This way, you can filter and sort by the author's name without an extra `populate()`.
The pattern of storing the author's name in the `bookSchema` and updating the book
collection every time an author's name changes is called _dereferencing_.
Dereferencing, or embedding data from one collection in another collection, is how
you can run MongoDB at massive scale without caching solutions like
[memcached](https://memcached.org).

If you're building a reading app, odds are you will update author names infrequently, 
but filter and sort books by author name frequently. A handy mnemomic for this
rule of thumb is to "store what you query for." Make the queries you execute most
frequently fast, at the cost of making infrequent updates slightly slower.

Versus Using `$lookup`
----------------------

[MongoDB 3.6 introduced a `$lookup` aggregation operator](/a-nodejs-perspective-on-mongodb-36-lookup-expr) that behaves similarly to a
[left outer join](https://www.dofactory.com/sql/left-outer-join). In other words,
even if you don't dereference the `author` property, you can use the aggregation
framework and `$lookup` to sort books by their author name.

```javascript
const [author1, author2] = await Author.create([
  { name: 'Michael Crichton' },
  { name: 'Ian Fleming' }
]);
await Book.create([
  { title: 'Jurassic Park', author: author1._id },
  { title: 'Casino Royale', author: author2._id }
]);

const books = await Book.aggregate([
  {
    $lookup: {
      from: 'Author',
      localField: 'author',
      foreignField: '_id',
      as: 'authorDoc'
    }
  },
  {
    $sort: {
      'authorDoc.name': 1
    }
  }
]);

books[0].title; // 'Casino Royale'
books[1].title; // 'Jurassic Park'
```

Why doesn't Mongoose populate use `$lookup`? The issue comes down to consistent
performance. Because `$lookup` executes a separate lookup for every document
coming into the `$lookup` stage, [`$lookup`'s performance degrades as `O(n^2)` in case of index misses](/slow-trains-in-mongodb-and-nodejs#break-up-one-slow-operation-into-many-fast-operations),
which in turn can then cause a [slow train](/slow-trains-in-mongodb-and-nodejs).

On the other hand, Mongoose executes 1 query for each `populate()` call, which leads
to better throughput, and only one collection scan in the event of an index miss.

But [Update Anomalies!](https://www.essentialsql.com/get-ready-to-learn-sql-11-database-third-normal-form-explained-in-simple-english/)
-----------------------

If you manually update the database or you have a separate app that doesn't correctly
update `authorName`, you might have a case where the author's name in the `Book`
model doesn't line up with the `Author` model. While update anomalies like this
are certainly possible, they are rare in production: the most likely causes are
either a manual update to the database that bypasses the app, or a developer
using a pattern that bypasses Mongoose middleware.

```javascript
const authorSchema = Schema({ name: String });
// Add middleware to update the dereferenced `authorName`
authorSchema.pre('save', async function() {
  if (this.isModified('name')) {
    await Book.updateMany({ authorId: this.author }, { authorName: this.name });
  }
});
const Author = mongoose.model('Author', authorSchema);

// Won't trigger the 'save' middleware. You would need a separate `pre('updateOne')`
// hook to capture this case.
await Author.updateOne({}, { name: 'test' });
```

If update anomalies occur, they're easy to fix with a migration. It's
much easier to identify and fix update anomalies than widespread performance
degradation.

Also, [sometimes data being "out of date" is a feature, not a bug](/managing-embedded-documents-with-monogram#updating-an-existing-document). My preferred example is this: say you're building a [gas delivery app](https://trybooster.com/).
Each request is associated with a vehicle. If a customer updates their vehicle from
a 2015 Toyota Camry to a 2018 BMW X1, should that affect requests they made 2 years ago?

Moving On
---------

"Store what you query for" is how you ensure consistent performance from MongoDB
when using Mongoose. In my experience, most MongoDB performance issues end up
being due to missing indexes and/or an overly complex aggregation that could be
replaced with a single query with a couple schema tweaks. Next time you're
scratching your head wondering why your aggregation is slow, think about what
properties you can dereference to streamline your query needs.

_Want to become your team's MongoDB expert? "Mastering Mongoose" distills 8 years of hard-earned lessons building Mongoose apps at scale into 153 pages. That means you can learn what you need to know to build production-ready full-stack apps with Node.js and MongoDB in a few days. <a href="https://masteringjs.io/ebooks/mastering-mongoose">Get your copy</a>!_

<a href="https://masteringjs.io/ebooks/mastering-mongoose" class="async-await-banner">
  <img src="https://masteringjs.io/ebooks/mastering-mongoose-horizontal.png">
</a>