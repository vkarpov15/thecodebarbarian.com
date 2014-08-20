If you're familiar with Ruby on Rails and are using MongoDB to build a NodeJS app, you might miss some slick ActiveRecord features, such as declarative validation. Diving into most of the basic tutorials out there, you'll find that many basic web development tasks are more work than you like. For example, if we borrow the style of http://howtonode.org/express-mongodb, a route that pulls a document by its ID will look something like this:

```
app.get('/document/:id', function(req, res) {
  db.collection('documents', function(error, collection) {
    collection.findOne({ _id : collection.db.bson_serializer.ObjectID.createFromHexString(req.params.id) },
        function(error, document) {
          if (error || !document) {
            res.render('error', {});
          } else {
            res.render('document', { document : document });
          }
        });
  });
});
```

In my [first post](http://thecodebarbarian.com/2013/04/29/easy-web-prototyping-with-mongodb-and-nodejs) I touched on MongooseJS, a schema and usability wrapper for MongoDB in NodeJS. MongooseJS was developed by LearnBoost, an education startup based in San Francisco, and maintained by 10gen. MongooseJS lets us take advantage of MongoDB's flexibility and performance benefits while using development paradigms similar to Ruby on Rails and ActiveRecord. In this post, I'll go into more detail about how The Ascot Project uses Mongoose for our data, some best practices we've learned, and some pitfalls we've found that aren't clearly documented.

Before we dive into the details of working with Mongoose, let's take a second to define the primary objects that we will be using. Loosely speaking, Mongoose's schema setup is defined by 3 types: `Schema`, `Connection`, and `Model`.

A *Schema* is an object that defines the structure of any documents that will be stored in your MongoDB collection; it enables you to define types and validators for all of your data items.

A *Connection* is a fairly standard wrapper around a database connection.

A *Model* is an object that gives you easy access to a named collection, allowing you to query the collection and use the Schema to validate any documents you save to that collection. It is created by combining a Schema, a Connection, and a collection name.

Finally, a *Document* is an instantiation of a Model that is tied to a specific document in your collection.

Okay, now we can jump into the dirty details of MongooseJS. Most MongooseJS apps will start something like this:

```
var Mongoose = require('mongoose');
var myConnection = Mongoose.createConnection('localhost', 'mydatabase');
 
var MySchema = new Mongoose.schema({
  name : {
    type : String,
    default : 'Val',
    enum : ['Val', 'Valeri', 'Valeri Karpov']
  },
  created : {
    type : Date,
    default : Date.now
  }
});
var MyModel = myConnection.model('mycollection', MySchema);
var myDocument = new MyModel({});
```

What makes this code so magical? There are 4 primary advantages that Mongoose has over the default MongoDB wrapper:

1. MongoDB uses named collections of arbitrary objects, and a Mongoose JS Model abstracts away this layer. Because of this, we don't have to deal with tasks such as asynchronously telling MongoDB to switch to that collection, or work with the annoying `createFromHexString` function. For example, in the above code, loading and displaying a document would look more like:
```
app.get('/document/:id', function(req, res) {
  Document.findOne({ _id : req.params.id }, function(error, document) {
    if (error || !document) {
      res.render('error', {});
    } else {
      res.render('document', { document : document });
    }
  });
});
```
1. Mongoose Models handle the grunt work of setting default values and validating data. In the above example `myDocument.name = 'Val'`, and if we try to save with a name that's not in the provided enum, Mongoose will give us back a nice error. If you want to learn a bit more about the cool things you can do with Mongoose validation, you can check out my blog post on how to integrate Mongoose validation with AngularJS.
1. Mongoose lets us attach functions to our models:
```
MySchema.methods.greet = function() { return 'Hello, ' + this.name; };
```
1. Mongoose handles limited sub-document population using manual references (i.e. no MongoDB DBRefs), which gives us the ability to mimic a familiar SQL join. For example:

```
var UserGroupSchema = new Mongoose.schema({
  users : [{ type : Mongoose.Schema.ObjectId, ref : 'mycollection' }]
});
var UserGroup = myConnection.model('usergroups', UserGroupSchema);
var group = new UserGroup({ users : [myDocument._id] });
group.save(function() {
  UserGroup.find().populate('users').exec(function(error, groups) {
    // Groups contains every document in usergroups with users field populated
    // Prints 'Val'
    console.log(groups[0][0].name);
  });
});
```

In the last few months, my team and I have learned a great deal about working with Mongoose and using it to open up the true power of MongoDB. Like most powerful tools, it can be used well and it can be used poorly, and unfortunately a lot of the examples you can find online fall into the latter. Through trial and error over the course of Ascot's development, my team has settled on some key principles for using Mongoose the right way:

1 Schema = 1 file
-----------------

A schema should never be declared in app.js, and you should never have multiple schemas in a single file (even if you intend to nest one schema in another). While it is often expedient to inline everything into app.js, not keeping schemas in separate files makes things more difficult in the long run. Separate files lowers the barrier to entry for understanding your code base and makes tracking changes much easier.

Mongoose can't handle multi-level population yet, and populated fields are not Documents.
-----------------------------------------------------------------------------------------

Nesting schemas is helpful but it's an incomplete solution. Design your schemas accordingly.

Let's say we have a few interconnected Models:

```
var ImageSchema = new Mongoose.Schema({
  url : { type : String},
  created : { type : Date, default : Date.now }
});
var Image = db.model('images', ImageSchema);
 
var UserSchema = new Mongoose.Schema({
  username : { type : String },
  image : { type : Mongoose.Schema.ObjectId, ref : 'images' }
});
 
UserSchema.methods.greet = function() {
  return 'Hello, ' + this.name;
};
 
var User = db.model('users', UserSchema);
 
var Group = new Mongoose.Schema({
  users : [{ type : Mongoose.Schema.ObjectId, ref : 'users' }]
});
```

Our Group Model contains a list of Users, which in turn each have a reference to an Image. Can MongooseJS resolve these references for us? The answer, it turns out, is yes and no.

```
Group.
  find({}).
  populate('user').
  populate('user.image').
  exec(function(error, groups) {
    groups[0].users[0].username; // OK
    groups[0].users[0].greet(); // ERROR - greet is undefined
 
    groups[0].users[0].image; // Is still an object id, doesn't get populated
    groups[0].users[0].image.created; // Undefined
  });
```

In other words, you can call `populate` to easily resolve an ObjectID into the associated object, but you can't call `populate` to resolve an ObjectID that's contained in that object. Furthermore, since the populated object is not technically a Document, you can't call any functions you attached to the schema. Although this is definitely a severe limitation, it can often be avoided by the use of nested schemas. For example, we can define our `UserSchema` like this:

```
var UserSchema = new Mongoose.Schema({
  username : { type : String },
  image : [ImageSchema]
});
```

In this case, we don't have to call `populate` to resolve the image. Instead, we can do this:

```
Group.
  find({}).
  populate('user').
  exec(function(error, groups) {
    groups[0].users[0].image.created; // Date associated with image
  });
```

However, nested schemas don't solve all of our problems, because we still don't have a good way to handle many-to-many relationships. Nested schemas are an excellent solution for cases where the nested schema can only exist when it belongs to exactly one of a parent schema. In the above example, we implicitly assume that a single image belongs to exactly one user - no other user can reference the exact same image object.

For instance, we shouldn't have UserSchema as a nested schema of Group's schema, because a User can be a part of multiple Groups, and thus we'd have to store separate copies of a single User object in multiple Groups. Furthermore, a User ought to be able to exist in our database without being part of any groups.

Declare your models exactly once and use dependency injection; never declare them in a routes file.
-----------------------------------------------------

This is best expressed in an example:

```
// GOOD
exports.listUsers = function(User) {
  return function(req, res) {
    User.find({}, function(error, users) {
      res.render('list_users', { users : users });
    });
  }
};
 
// BAD
var db = Mongoose.createConnection('localhost', 'database');
var Schema = require('../models/User.js').UserSchema;
var User = db.model('users', Schema);
 
exports.listUsers = return function(req, res) {
  User.find({}, function(error, users) {
    res.render('list_users', { users : users });
  });
};
```

The biggest problem with the "bad" version of listUsers shown above is that if you declare your model at the top of this particular file, you have to define it in every file where you use the User model. This leads to a lot of error-prone find-and-replace work for you, the programmer, whenever you want to do something like rename the Schema or change the collection name that underlies the User model.

Early in Ascot's development we made this mistake with a single file, and ended up with a particularly annoying bug when we changed our MongoDB password several months later. The proper way to do this is to declare your Models exactly once, include them in your `app.js`, and pass them to your routes as necessary.

In addition, note that the "bad" `listUsers` is impossible to unit test. The User schema in the "bad" example is inaccessible through calls to require, so we can't mock it out for testing. In the "good" example, we can write a test easily using Nodeunit:

```
var UserRoutes = require('./routes/user.js');
 
exports.testListUsers = function(test) {
  mockUser.collection = [{ name : 'Val' }];
  var fnToTest = UserRoutes.listUsers(mockUser);
  fnToTest( {},
    { render : function(view, params) {
        test.equals(mockUser.collection, params.users); test.done();
      }
    });
};
```

And speaking of Nodeunit:

Unit tests catch mistakes, encourage you to write modular code, and allow you to easily make sure your logic works. They are your friend.
---------------------------

I'll be the first to say that writing unit tests can be very annoying. Some tests can seem trivial, they don't necessarily catch all bugs, and often you write way more test code than actual production code. However, a good suite of tests can save you a lot of worry; you can make changes and then quickly verify that you haven't broken any of your modules. Ascot Project currently uses Nodeunit for our backend unit tests; Nodeunit is simple, flexible, and works well for us.

And there you have it! Mongoose is an excellent library, and if you're using MongoDB and NodeJS, you should definitely consider using it. It will save you from writing a lot of extra code, it'll handle some basic population, and it'll handle all your validation and object creation grunt work. This adds up to more time spent building awesome stuff, and less time trying to figure out how to get your database interface to work.

*Have any questions about the code featured in this post? Want to suggest a better approach? Feel like telling me why the MEAN Stack is the worst thing that ever happened in the history of the world and how horrible I am? Go ahead and leave a comment below, or shoot me an email at valkar207@gmail.com and I'll do my best to answer any questions you might have. You can also find me on github at https://github.com/vkarpov15. My current venture is called The Ascot Project, and you can find that over at http://www.AscotProject.com. Huge thanks to my partner William Kelly (@idostartups) for all of his work helping me get this post together.*
