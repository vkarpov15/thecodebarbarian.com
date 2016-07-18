Mongoose 4.5 introduces a new API for [populating](http://mongoosejs.com/docs/populate.html) documents. The new
virtual populate API addresses some significant limitations in the conventional
populate API. Before you learn about the virtual populate API, let's see what's
wrong with conventional populate.

But Populate Is Awesome!
------------------------

The `populate()` function is mongoose's mechanism for pseudo-joins. Let's say
you have 2 collections, 'Author' and 'BlogPost':

```javascript
const AuthorSchema = new Schema({
  name: String,
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost' }]
});

const BlogPostSchema = new Schema({
  title: String,
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
    content: String
  }]
});

const Author = mongoose.model('Author', AuthorSchema, 'Author');
const BlogPost = mongoose.model('BlogPost', BlogPostSchema, 'BlogPost');
```

Using the conventional `populate()` API, you can load all an author's blog
posts with a single query.

```javascript
Author.findOne().populate('posts').exec(function(error, author) {
  // `author.posts` is an array of `BlogPost` documents
});
```

You can even load all an author's blog posts and all the authors of comments
on the author's blog posts.

```javascript
Author.
  findOne().
  populate({
    path: 'posts',
    populate: {
      path: 'comments.author'
    }
  }).
  exec(function(error, author) {
    // `author.posts.comments.author` now contains `Author` documents
  });
```

Populate is powerful, but encourages you to design your MongoDB schemas
poorly. The relationship between authors and blog posts is a one-to-many
relationship - each blog post has exactly one author, but an author can have
multiple blog posts. The best way to model this in MongoDB would be for a
blog post to have an 'author' field that points to the author of the post.
Having an array of blog post refs in the author document is bad because the
'posts' array will grow without bound, so an author with thousands of posts
will lead to an unwieldy document. These huge documents lead to wasted
bandwidth. Even worse, the 'posts' array is not useful unless you `populate()`
it. Furthermore, what if you want to find blog posts and populate the
author of the post?

Introducing Virtual Populate
----------------------------

The correct way to model this relationship is using an 'author' property in
`BlogPostSchema`. You can then define the 'posts' property as a _virtual_,
that is, a field that mongoose never persists to the database.

```javascript
const AuthorSchema = new Schema({
  name: String
});

// Specifying a virtual with a `ref` property is how you enable virtual
// population
AuthorSchema.virtual('posts', {
  ref: 'BlogPost',
  localField: '_id',
  foreignField: 'author'
});

const BlogPostSchema = new Schema({
  title: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
  comments: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'Author' },
    content: String
  }]
});

const Author = mongoose.model('Author', AuthorSchema, 'Author');
const BlogPost = mongoose.model('BlogPost', BlogPostSchema, 'BlogPost');
```

You can use the 'posts' virtual to get all an author's blog posts in the same
way:

```javascript
Author.findOne().populate('posts').exec(function(error, author) {
  // `author.posts` is an array of `BlogPost` documents
});
```

But now, even if your author has thousands of blog posts, your author document
and blog post documents will always be small. Plus, you can use the
`populate()` to get a blog post's author:

```javascript
BlogPost.findOne().populate('author').exec(function(error, author) {
  // `author` now contains an 'Author' document
});
```

If you want to get super fancy, you can even find the posts posted by
every user that's commented on a blog post:

```javascript
BlogPost.
  findOne().
  populate({
    path: 'comments.author',
    populate: {
      path: 'posts'
    }
  }).
  exec(function(error, author) {
    // `comments.author.posts` now contains an array of all posts that the
    // comment's author wrote
  });
```

Moving On
---------

The virtual populate API is an exciting addition to mongoose that enables you
to design your schemas in an idiomatic way rather than design around the
populate API. Virtual populate is not a replacement for the conventional
populate API, its a complementary feature that lets you do things like
`populate()` in reverse and [`populate()` without an id field](https://github.com/Automattic/mongoose/issues/2562). Virtual populate
is the most important new feature of mongoose 4.5.0, so be sure to check it out!
