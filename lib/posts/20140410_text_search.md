MongoDB shipped the newest stable version of its server, 2.6.0, this week. This new release is massive: there were about [4000 commits](https://github.com/mongodb/mongo/branches) between 2.4 and 2.6. Unsurprisingly, the [release notes](http://docs.mongodb.org/manual/release-notes/2.6/) are a pretty dense read and don't quite convey how cool some of these new features are. To remedy that, I'll dedicate a couple posts to putting on my NodeJS web developer hat and exploring interesting use cases for new features in 2.6. The first feature I'll dig in to is text search, or, in layman's terms, Google for your MongoDB documents.

Text search was technically in 2.4, but it was an experimental feature and not part of the query framework. Now, in 2.6, text is a full-fledged query operator, enabling you search for documents by text in [15 different languages](http://docs.mongodb.org/manual/reference/text-search-languages/#text-search-languages).

Getting Started With Text Search
--------------------------------

Let's dive right in and use text search on the USDA SR-25 data set described in [this post](http://thecodebarbarian.com/2014/03/28/plugging-usda-nutrition-data-into-mongodb/). You can download a mongorestore-friendly version of the data set here. The data set contains 8194 food items with associated nutrition data, and each food item has a human-readable description, e.g. "Kale, raw" or "Bison, ground, grass-fed, cooked". Ideally, as a client of this data set, we shouldn't have to remember whether we need to enter "Bison, grass-fed, ground, cooked" or "Bison, ground, grass-fed, cooked" to get the data we're looking for. We should just be able to put in "grass-fed bison" and get reasonable results.

Thankfully, text search makes this simple. In order to do text search, first we need to [create a text index](http://docs.mongodb.org/manual/core/index-text/#create-text-index) on your copy of the USDA nutrition collection. Lets create one on the food item's description:

```
db.nutrition.ensureIndex({ description : "text" });
```

Now, we can search the data set for our "raw kale" and "grass-fed bison", and see what we get:

```
db.nutrition.find(
  { $text : { $search : "grass-fed bison" } },
  { description : 1 }).
    limit(3);
 
db.nutrition.find(
  { $text : { $search : "raw kale" } },
  { description : 1 }).
    limit(3);
```

[<img src="//i.imgur.com/JSDNeam.png" style="width: 100%">](http://i.imgur.com/JSDNeam.png)

Unfortunately, the results we got aren't that useful, because they're not in order of relevance. Unless we explicitly tell MongoDB to sort by the text score, we probably won't get the most relevant documents first. Thankfully, with the help of the new [`$meta` keyword](http://docs.mongodb.org/master/reference/operator/projection/meta/#proj._S_meta) (which is currently only useful for getting the text score), we can tell MongoDB to sort by text score [as described here](http://docs.mongodb.org/master/reference/operator/query/text/#ex-sort-text-search-score):

```
db.nutrition.find(
  { $text : { $search : "raw kale" } },
  { description : 1, textScore : { $meta : "textScore" } }).
    sort({ textScore : { $meta : "textScore" } }).
    limit(3);
```

[<img src="//i.imgur.com/q6Xh433.png" style="width: 100%">](http://i.imgur.com/q6Xh433.png)

Using Text Search in NodeJS
---------------------------

First, an important note on the compatibility of text search with NodeJS community projects: the [MongoDB NodeJS driver](https://github.com/mongodb/node-mongodb-native) is compatible with text search going back to at least 1.3.0. However, only the latest version of [mquery](https://github.com/aheckmann/mquery), 0.6.0, is compatible with text search. By extension, the popular ODM [Mongoose](https://github.com/LearnBoost/mongoose), which relies on mquery, unfortunately doesn't have a text search compatible release at the time of this blog post. I pushed a [commit to fix this](https://github.com/LearnBoost/mongoose/commit/22602aef2af6cc0b7eddb1ac4fbe73fcd05384e5) and the next version of Mongoose, 3.8.9, should allow you to sort by text score. In summary, to use MongoDB text search, here are the version restrictions:

* [MongoDB NodeJS driver](https://github.com/mongodb/node-mongodb-native): >= 1.4.0 is recommended, but it seems to work going back to at least 1.2.0 in my personal experiments.
* [mquery](https://github.com/aheckmann/mquery): >= 0.6.0
* [Mongoose](https://github.com/LearnBoost/mongoose): >= 3.8.9 (unfortunately not released yet as of 4/9/14)

Now that you know which versions are supported, let's demonstrate how to actually do text search with the NodeJS driver. I created a simple food journal (e.g. an app that counts calories for you when you enter in how much of a certain food you've eaten) app that is meant to tie in to the SR-25 data set. This app is available on GitHub [here](https://github.com/vkarpov15/lean-mean-nutrition-sample), so feel free to play with it.

The LeanMEAN app exposes an API endpoint, `GET /api/food/search/:search`, that runs text search on a local copy of the SR-25 data set. The implementation of this endpoint is here. For convenience, here is the actual implementation, where the `foodItem` variable is a wrapper around the Node driver's connection to the SR-25 collection.

```
/* Because MongooseJS doesn't quite support sorting by text search score
* just yet, just use the NodeJS driver directly */
exports.searchFood = function(foodItem) {
 return function(req, res) {
   var search = req.params.search;
   foodItem.connection().
     find(
       { $text : { $search : search } },
       { score : { $meta: "textScore" } }
     ).
     sort({ score: { $meta : "textScore" } }).
     limit(10).
     toArray(function(error, foodItems) {
       if (error) {
         res.json(500, { error : error });
       } else {
         res.json(foodItems);
       }
     });
 }
};
```

Unsurprisingly, this code looks pretty similar to the shell version, so it shouldn't look unfamiliar to you NodeJS pros :)

Looking Forward
---------------

And that's all on text search for now. In the next post (scheduled for 4/25), we'll tackle some of the awesome new features in the aggregation framework, including text search in aggregation.
