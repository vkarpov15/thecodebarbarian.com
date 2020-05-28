[Mongoose](https://mongoosejs.com/)'s growth over the last few years has
been astonishing. Mongoose is now the most popular database framework
for Node.js, both in terms of weekly downloads on [npm](https://www.npmjs.com/package/mongoose) and
in terms of repos using it on GitHub. It's also stood the test of time: [Mongoose celebrated its 10th birthday this year](https://twitter.com/mongoosejs/status/1246542147819573248).

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Today is Mongoose&#39;s 10th birthday! We&#39;re so proud of where Mongoose is today, and looking forward to 10 more years 🥳🎉🍾<br><br>A big shout out to all our contributors over the last decade, including: <a href="https://twitter.com/code_barbarian?ref_src=twsrc%5Etfw">@code_barbarian</a> <a href="https://twitter.com/aaronheckmann?ref_src=twsrc%5Etfw">@aaronheckmann</a> <a href="https://twitter.com/rauchg?ref_src=twsrc%5Etfw">@rauchg</a> <a href="https://twitter.com/ChingFengHsu?ref_src=twsrc%5Etfw">@ChingFengHsu</a> <a href="https://twitter.com/hashtag/NodeJS?src=hash&amp;ref_src=twsrc%5Etfw">#NodeJS</a> <a href="https://twitter.com/hashtag/MongoDB?src=hash&amp;ref_src=twsrc%5Etfw">#MongoDB</a> <a href="https://t.co/5BL6dz5qo9">pic.twitter.com/5BL6dz5qo9</a></p>&mdash; mongoosejs (@mongoosejs) <a href="https://twitter.com/mongoosejs/status/1246542147819573248?ref_src=twsrc%5Etfw">April 4, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Mongoose is a powerful framework with an active community. But, based on the
[80k StackOverflow questions](https://stackoverflow.com/search?q=mongoose), there's
a lot of confusion out there about how you should build Mongoose apps.

The Mongoose documentation is focused on helping developers solve
problems given a wide variety of different architectures, environments,
and experience levels. Unfortunately, that approach leaves a gap for a
more opinionated guide that explains Mongoose fundamentals from
base principles.

Introducting [_Mastering Mongoose_](https://masteringjs.io/ebooks/mastering-mongoose)
---------------------------------

[_Mastering Mongoose_](https://masteringjs.io/ebooks/mastering-mongoose) is a carefully curated guide that explains the
fundamentals of Mongoose and how they relate to building apps in
different frameworks. It distills 8 years of experience building
Mongoose apps with wildly different frameworks, team compositions,
and budgets into 153 concise pages. You'll learn:

- The 5 fundamental classes in Mongoose: Model, Document, Schema, Connection, and Query
- 3 schema design principles for ensuring your database queries stay fast when your collections grow beyond 100k documents
- How to use the 4 different types of middleware in Mongoose
- Design patterns for modeling one-to-many and many-to-many relationships in Mongoose using `populate()`
- When you should use middleware as opposed to setters or validators, and vice versa
- How to determine what indexes you need, and how to evaluate the effectiveness of your indexes
- 2 different patterns for implementing pagination: one for convenience, and one for performance
- How to build HTTP apps with Express and Mongoose
- How to implement JWTs and access tokens with Mongoose
- 4 different design patterns for instantiating Mongoose models, and the tradeoffs between them
- How to build Websocket apps with [ws](https://www.npmjs.com/package/ws) and Mongoose

_Mastering Mongoose_ also comes with 4 sample apps that demonstrate how these lessons come together
in building a real app.

Since _Mastering Mongoose_ is a guide rather than a complete reference,
what the eBook omits is as important as what it includes. Here are
some of the more controversial choices:

- Aggregation framework. The eBook includes a brief aside on aggregation middleware, but explicitly excludes going into detail about how to write aggregations. I believe that most Mongoose apps are better off using [cursors](/cursors-in-mongoose-45) and aggregating in memory for [performance](/slow-trains-in-mongodb-and-nodejs#break-up-one-slow-operation-into-many-fast-operations) and readability reasons.
- [Transactions](/a-node-js-perspective-on-mongodb-4-transactions.html). Many developers don't think you can write a real app without transactions. I strongly disagree. Building an app that transfers currency between accounts? You need transactions. Building a Twitter clone? You don't need transactions.
- [Read preferences](https://mongoosejs.com/docs/guide.html#read) and [write concerns](https://mongoosejs.com/docs/guide.html#writeConcern). Read preferences are great for [reading data from the geographically closest server](https://docs.mongodb.com/manual/core/read-preference-use-cases/#query-from-geographically-distributed-members) and write concerns are great for ensuring data integrity in the event of an unclean shutdown. But I've worked on MongoDB apps that operate fine at massive scale with no read preferences or write concerns, so I don't think these are "must haves" for every app.

Moving On
---------

_Mastering Mongoose_ contains the hard-earned lessons from 8 years of building Mongoose apps,
including what concepts and design patterns are indispensible for building a new app in 2020
and beyond. Check out the online preview at <a href="https://masteringmongoose.com/">masteringmongoose.com</a>,
and <a href="https://masteringjs.io/ebooks/mastering-mongoose">get your copy today!</a>.