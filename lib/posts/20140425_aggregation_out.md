From a performance perspective as well as a developer productivity perspective, MongoDB really shines when you only need to load one document to display a particular page. A traditional hard drive only needs one sequential read to load a single MongoDB document, which limits your performance overhead. In addition, much like how [Nas says life is simple because all he needs is one mic](http://rapgenius.com/Nas-one-mic-lyrics#note-948605), grouping all the data for a single page into one document makes understanding and debugging the page much simpler.

A place where the one document per page heuristic is particularly relevant is on pages that display historical data. Loading a single user object is fast and simple, but running an [aggregation](http://thecodebarbarian.wordpress.com/2014/02/14/crunching-30-years-of-nba-data-with-mongodb-aggregation/) to compute the average number of times per month a user performed a certain action over the last 6 months is a costly operation that you don't necessarily want to do on-demand. NodeJS devs are spoiled in this regard, because [scheduling in NodeJS](http://thecodebarbarian.com/2013/12/02/price-internationalization-with-the-mean-stack/comment-page-1/) is extremely simple. You can easily schedule these aggregations to run once per day and avoid the performance overhead of running the aggregation every time a user hits the particular page.

However, before MongoDB 2.6, shipping the results of an aggregation into a separate collection required pulling the aggregation results in through the NodeJS driver and inserting them back into MongoDB. Furthermore, aggregation results were limited to 16MB in size, which made doing aggregations that would output one document per user impossible. MongoDB 2.6, however, introduced a [`$out` aggregation pipeline stage](http://docs.mongodb.org/manual/reference/operator/aggregation/out/#pipe._S_out), which writes the output of the aggregation to a separate collection, and removed the 16MB aggregation limit.

Getting transformed data `$out` of aggregation
------------------------------------------

Let's take a look at how this can be used in practice in NodeJS. Recall the [food journal app](https://github.com/vkarpov15/lean-mean-nutrition) from the [first part of this series](http://thecodebarbarian.com/2014/04/10/a-nodejs-perspective-on-whats-new-in-mongodb-2-6-part-i-text-search/): let's add a route that will display the user's average calories per day broken down on a per-week basis. This involves a slow and complex aggregation, so we'll schedule this aggregation to run once per day and dump its data to a [new collection using `$out`](http://docs.mongodb.org/manual/reference/operator/aggregation/out/#pipe._S_out). The data for this route will get recomputed for all users using one aggregation, and each time the user hits the API endpoint all the server will do is read one document. Here's what the aggregation looks like in NodeJS (you can also copy/paste this aggregation pipeline into a mongo shell and get the same result). You can also find this code on [Github](https://github.com/vkarpov15/lean-mean-nutrition/blob/master/dependencies/aggregate_weekly_calories.js#L15-79).

```
mongodb.connection().collection('days').aggregate([
  // Pull out week of the year and day of the week from the date
  {
    $project : {
      week : { $week : "$date" },
      dayOfWeek : { $dayOfWeek : "$date" },
      year : { $year : "$date" },
      user : "$user",
      foods : "$foods"
    }
  },
  // Generate a document for each food item
  {
    $unwind : "$foods"
  },
  // And for each nutrient
  {
    $unwind : "$foods.nutrients"
  },
  // Only care about calories
  {
    $match : {
     'foods.nutrients.tagname' : 'ENERC_KCAL'
    }
  },
  // Add up calories for each week, keeping track of how many days in that
  // week the user recorded eating something. Output one document per
  // user and week.
  {
    $group : {
      _id : {
        week : "$week",
        user : "$user",
        year : "$year"
      },
      days : { $addToSet : '$dayOfWeek' },
      calories : {
        $sum : {
          $multiply : [
            '$foods.nutrients.amountPer100G',
            { $divide : ['$foods.selectedWeight.grams', 100] }
          ]
        }
      }
    }
  },
  // Aggregate all the documents on a per-user basis.
  {
    $group : {
      _id : "$_id.user",
      weeks : { $push : "$_id.week" },
      yearForWeek : { $push : "$_id.year" },
      daysPerWeek : { $push : "$days" },
      caloriesPerWeek : { $push : "$calories" }
    }
  },
  // Output to the 'weekly_calories' collection
  {
    // Hardcode string here so can copy/paste this aggregation into shell
    // for instructional purposes.
    $out : 'weekly_calories'
  }
], callback);
```

The particular details of the aggregation aren't that important, what really matters is the `$out` stage at the end. The `$out` stage does something very cool: not only will the resulting documents get inserted into a new collection called `weekly_calories`, `$out` will overwrite the existing collection once the aggregation completes. In other words, if this aggregation runs for an hour, the `weekly_calories` collection will remain unchanged until the aggregation is done. After the aggregation finishes, the `weekly_calories` collection will be [atomically replaced by the result of the aggregation](http://docs.mongodb.org/manual/reference/operator/aggregation/out/#replace-existing-collection). Note that, right now, `$out` doesn't have any way of appending to the output collection, it can only overwrite the output collection. Design your aggregations accordingly.

Taking a look at the results
------------------------

Using a bit of NodeJS magic, we can wrap this aggregation in a service that uses [node-cron](https://github.com/ncb000gt/node-cron) to schedule itself to run once per day at 0030 (12:30 am) server time:

[<img src="http://thecodebarbarian.files.wordpress.com/2014/04/image00.png" style="width: 100%">](http://thecodebarbarian.files.wordpress.com/2014/04/image00.png)

We can then inject this service into an ExpressJS route and expose the route as a `GET /api/weekly` JSON API endpoint:

```
// app.js
app.get('/api/weekly', checkLogin, api.byWeek.inject(di));
 
// api.js
exports.byWeek = function(weeklyCalorieAggregator) {
  return function(req, res) {
    weeklyCalorieAggregator.get(req.user.username, function(error, doc) {
      res.json(doc);
    });
  }
};
```

A little extra work (here's the [git diff](https://github.com/vkarpov15/lean-mean-nutrition/commit/3da984d842365700675563a2fc8e1bff163f4848)) to put together a UI that displays the data from `GET /api/weekly` gives a very satisfying result:

[<img src="http://thecodebarbarian.files.wordpress.com/2014/04/image01.png" style="width: 100%">](http://thecodebarbarian.files.wordpress.com/2014/04/image01.png)

NodeJS Project Version Compatibility
-------------------------------

Good news, this time around, the latest versions of [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) (1.4.2), [mquery](https://github.com/aheckmann/mquery) (0.6.0), and [mongoose](https://github.com/LearnBoost/mongoose) (3.8.8) support `$out` in aggregation. I've run the above aggregation with versions 1.3 and 1.2 of node-mongodb-native and version 3.6 of mongoose and those handle `$out` correctly too.

Conclusion
-------------

MongoDB 2.6's improvements to the aggregation framework are a quantum leap forward, and enable you to do some amazing things. While scheduled analytics calculations certainly aren't the only use case of `$out`, I hope this post showed you at least one way in which $out allows you to play to MongoDB's strengths in a new way.

*This is Part II of a 3-part series on using new MongoDB 2.6 features in NodeJS. ~~Part III of this series is coming up in 2 weeks, in which I'll take a look at some of MongoDB 2.6's query framework improvements, primarily index filters.~~*
