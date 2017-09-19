I often get questions about [how to secure user passwords in mongoose](https://stackoverflow.com/questions/12096262/how-to-protect-the-password-field-in-mongoose-mongodb-so-it-wont-return-in-a-qu). The answer is a one-liner, but I now think there's a better answer: why do you store the user's password in the user document anyway? This may seem blasphemous given that MongoDB's ["single view of the customer"](https://www.mongodb.com/presentations/mongodb-single-customer-view) use case and that denormalization is one of MongoDB's killer features. However, I've used this paradigm successfully for several projects. In this article, I'll make the case that a separate `AuthenticationMethod` collection is the way to go for storing password hashes in your database.

When Do You Need The Password Hash?
-----------------------------------

One of the two MongoDB schema design principles I harped on in my [MEAN stack video course](https://www.edx.org/course/introduction-mongodb-using-mean-stack-mongodbx-m101x-0) was represented by the handy mnemonic "store what you query for." However, the course's examples were all based on denormalization and including extra data in the document. For example, storing an `ancestors` array that contained the ids of all ancestor nodes in a tree categories makes it easy to, say, find all categories that are descendants of the "Phones" category. However, this principle goes the other way: if you don't really need the data in the document, it may make sense to remove it.

The common way to store passwords in mongoose is on the user document with `select: false` to ensure mongoose [projects](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/) the password out of queries by default. You can then explicitly call `select()` to get the password when you need it.

```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, select: false }
});

// If you set the password, be sure to hash it using bcrypt before saving
userSchema.pre('save', function(next) {
  if (this.isModified('password')) {
    return bcrypt.hash(this.password, 8, (err, hash) => {
      if (err) {
        return next(err);
      }
      this.password = hash;
      next();
    });
  }
  next();
});

const User = mongoose.model('User', userSchema, 'User');

const user = yield User.create({ email: 'val@test.com', password: 'taco' });

// No `password` property by default
// { _id: 598dc57ed14a704778294a79, email: 'val@test.com', __v: 0 }
console.log(yield User.findById(user._id));
// But you can explicitly select it
// { _id: 598dc57ed14a704778294a79,
//  email: 'val@test.com',
//  password: // '$2a$08$tHAxGhNJcgSow4zDtHPa1Ol5AkJhpdN3JpXlqycpFj3EqiV/BghO.',
//  __v: 0 }
console.log(yield User.findById(user._id).select('+password'));
```

However, you only need the password in 1 place: login. Even resetting the password and updating the password don't require having the current password hash on hand. Login is a rare case, and not performance sensitive. Remember, reads should be fast, writes can be a little slower because they're less frequent and the user is more willing to wait. The primary concern with password hashes is not leaking them when you display a list of users. You'll never query by a [bcrypt](https://www.npmjs.com/package/bcrypt) password hash, so why store it in the user document? If you store the password in a separate collection, you can just `populate()` it when you need it:

```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  passwordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Password'
  }
});

const passwordSchema = new mongoose.Schema({
  password: { type: String }
});

// If you set the password, be sure to hash it using bcrypt before saving
passwordSchema.pre('save', function(next) {
  if (this.isModified('password')) {
    return bcrypt.hash(this.password, 8, (err, hash) => {
      if (err) {
        return next(err);
      }
      this.password = hash;
      next();
    });
  }
  next();
});

const User = mongoose.model('User', userSchema, 'User');
const Password = mongoose.model('Password', passwordSchema, 'Password');

const password = yield Password.create({ password: 'taco' });
const user = yield User.create({
  email: 'val@test.com',
  passwordId: password._id
});

// No `password` property by default
console.log(yield User.findById(user._id));
// But you can explicitly populate it
console.log(yield User.findById(user._id).populate('passwordId'));
```

Storing the password hash in a separate collection has a couple neat properties. First, it's more secure, because if you have apps that don't use mongoose or you access MongoDB through a GUI, you'll need to remember to hide the password hash there too. If password hashes are in a separate collection, you can use [custom roles to ensure that only certain users can access the `Password` collection ](https://docs.mongodb.com/manual/core/collection-level-access-control/). Secondly, this ensures a cleaner separation of concerns. Devs working with the customer document structure don't have to always worry about keeping password hashes secure.

Extending to OAuth
------------------

OAuth similarly has a very sensitive piece of data: access tokens. You definitely do not want to leak user access tokens. As a matter of fact, you want to encrypt them and guard them closely, as [Buffer and MongoHQ learned in 2013](https://techcrunch.com/2013/10/29/hosting-service-mongohq-suffers-major-security-breach-that-explains-buffers-hack-over-the-weekend/). Storing access tokens in the user document is not uncommon, there are even [plugins to help encrypt access tokens](https://www.npmjs.com/package/mongoose-encrypt).

These days, I think it's better to have a separate `AuthenticationMethod` collection. Using mongoose's [virtual populate feature](http://thecodebarbarian.com/mongoose-virtual-populate), you don't even have password ids in your customer document anymore.

```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true }
}, { toObject: { virtuals: true } });

userSchema.virtual('authenticationMethods', {
  ref: 'AuthenticationMethod',
  localField: '_id',
  foreignField: 'userId'
});

const authenticationMethodSchema = new mongoose.Schema({
  // Can also use discriminators, but avoiding for didactic reasons
  type: { type: String, enum: ['OAUTH', 'PASSWORD'] },
  password: {
    type: String,
    required: function() { return this.type === 'PASSWORD'; }
  },
  accessToken: {
    type: String,
    required: function() { return this.type === 'OAUTH'; },
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }
});

// If you set the password, be sure to hash it using bcrypt before saving
authenticationMethodSchema.pre('save', function(next) {
  if (this.isModified('password')) {
    return bcrypt.hash(this.password, 8, (err, hash) => {
      if (err) {
        return next(err);
      }
      this.password = hash;
      next();
    });
  }
  next();
});

const User = mongoose.model('User', userSchema);
const AuthenticationMethod = mongoose.model('AuthenticationMethod', authenticationMethodSchema);

const user = yield User.create({
  email: 'val@test.com'
});
yield AuthenticationMethod.create({ userId: user._id, type: 'PASSWORD', password: 'taco' });
yield AuthenticationMethod.create({ userId: user._id, type: 'OAUTH', accessToken: 'test' });

// No `authenticationMethods` by default...
console.log(yield User.findById(user._id));
// But you can explicitly populate them
console.log(yield User.findById(user._id).populate('authenticationMethods'));
```

**Note:** I skipped encrypting the access tokens above because this example is already a little heavy. That's left as an exercise to the reader, see [Proof by Rudin](http://uncyclopedia.wikia.com/wiki/Proof#Proof_by_Surprise).

Moving On
---------

Sometimes, the right way to do things is not immediately obvious. But, if you find yourself constantly bending over backwards because of a certain decision, it's time to reconsider and see whether that idea actually lines up with your priorities. With passwords and access tokens, the priority is security, not performance, because they are very rarely used. Storing them in a separate MongoDB collection gives you better security and better separation of concerns, with little to no overhead for your fellow devs (as long as you're using [mongoose](https://www.npmjs.com/package/mongoose)).
