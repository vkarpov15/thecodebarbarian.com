Displaying prices in different currencies is a common internationalization task for web developers. However, this task can be a bit tricky:

* While there are a number of services that provide foreign exchange rates, they are usually expensive, especially for a high volume of requests.
* Unless you make a request for updated exchange rates every time a user loads a page, you will need to find some way to schedule your requests.

In this post we'll walk through how to build this functionality into your next website with the MEAN Stack (MongoDB, Node.js, AngularJS, and ExpressJS). The code for this example is available on [Github](https://github.com/vkarpov15/mean-exchange-rates), in case you want to skip straight to the code.

The Problem
-----------

Let's say that we have an online store where we sell watches from James Bond films. Naturally, since the last film *Skyfall* grossed over $700M outside the US, we would like to make the shopping experience for our international customers as seamless as for domestic customers. A big part of this is showing our prices in our customer's local currency, because the vast majority of our customers will only have a vague idea of the exchange rate between their local currency and US dollars. Here are 3 pictures representing the behavior we want to have:

Our shopper loads the page and sees the price of the watch in US Dollars:

[<img src="http://thecodebarbarian.files.wordpress.com/2013/12/currency1.png" style="width: 100%">](http://thecodebarbarian.files.wordpress.com/2013/12/currency1.png)

Our shopper decides they want to see the prices in Turkish Lira, so they find the currency in our dropdown:

[<img src="http://thecodebarbarian.files.wordpress.com/2013/12/currency2.png" style="width: 100%">](http://thecodebarbarian.files.wordpress.com/2013/12/currency2.png)

When our shopper clicks Turkish Lira, our page updates without a page refresh to show how much our watches cost in the selected currency.

[<img src="http://thecodebarbarian.files.wordpress.com/2013/12/currency3.png" style="width: 100%">](http://thecodebarbarian.files.wordpress.com/2013/12/currency3.png)

General idea for the solution
-----------------

In the past, I've used the [Open Exchange Rates API](https://openexchangerates.org/), which offers 1000 free requests per month. 1000 requests may sound like a lot, but if you're requesting the rates every time a user loads a page, you're probably going to hit 1000 requests just testing your site. Furthermore, you're making an extra HTTP request each time you load the page, so you're wasting both time and money. How can we do better? What if we could request foreign exchange rates once per day?

Intraday changes in exchange rates are usually pretty insignificant unless you're dealing with millions of dollars. For example, the exchange rate from Euros to US Dollars, abbreviated EUR/USD, is so steady that a change of 0.02 in a single day is [headline news](http://finance.yahoo.com/news/eur-usd-largest-one-day-215100423.html). You may want more precise rates, but for the sake of this blog post we'll assume that we can get away with reloading our rates once every 24 hours. We can then store the rates on our server and serve them up inlined in our HTTP responses.

However, making an HTTP request daily and loading the results into your server is a problem with many subtleties. You need some way to schedule the HTTP request to run and you need some sort of concurrent I/O to keep the data in memory. The canonical language-independent solution would involve setting up a cron job on your Linux server which writes the output to a file, and then read the file every time you want to access your exchange rates.

As you might have guessed, the cron job solution is riddled with complexity and difficulty. Cron jobs are platform-specific, difficult to test, and add extra complexity to setting up your server. If I had a dollar for every time I ran into a bug because a cron job was running a script as a different user, I'd have enough money to buy myself the [Omega Seamaster](http://www.amazon.com/Omega-Seamaster-Planet-Chrono-232-92-46-51-03-001/dp/B00CJG2K56/ref=sr_1_2?ie=UTF8&qid=1408977805&sr=8-2&keywords=omega+seamaster+planet+ocean+600m) from the watch store in this example. Furthermore, if you want to set up your cron job on your Windows laptop, good luck. Finally, you'll run into one more subtle issue. When you dump the data to a file, you don't have a good way to query or maintain historical exchange rates, but if you want to save this data to an SQL database, the effort of setting up a separate column for every currency simply isn't worth the work.

Thankfully, with NodeJS and MongoDB, these problems disappear. In NodeJS, you have absolutely no excuse to use cron jobs. [Node-cron](https://github.com/ncb000gt/node-cron) is a very small and simple npm library that provides a wrapper around Javascript's `setTimeout` and `setInterval` functions using scheduling syntax similar to a standard unix cron job. Best of all, this runs in the server's memory space, so you don't have to dump the data to a file before pulling it into your server. MongoDB allows you to simply save the JSON data you receive from Open Exchange Rates as-is, with no extra work of setting up columns, while providing you with the ability to run sophisticated queries on your data.

Implementing the solution
------------------------

In this section, we're going to walk through internationalizing the prices for our example online watch store. The finished code for is located [here](https://github.com/vkarpov15/mean-exchange-rates), in case you prefer to dig right in to the code. This repo started as a [bare clone](https://help.github.com/articles/duplicating-a-repository) of [mean-stack-skeleton](https://github.com/vkarpov15/mean-stack-skeleton).

1) Querying and storing foreign exchange rates snapshots
------------------------

First things first, lets write a MongooseJS model for our FX data [(github)](https://github.com/vkarpov15/mean-exchange-rates/blob/master/models/FxSnapshot.js#L10-18):

```
var Mongoose = require('mongoose');
 
exports.FxSnapshotSchema = new Mongoose.Schema({
// The time that the snapshot was taken
  time : { type : Date, default : Date.now },
  // Means that 'rates' can be anything
  rates : Mongoose.Schema.Types.Mixed
});
 
// Make sure we have an index on the time of the snapshot
exports.FxSnapshotSchema.index({ 'time' : -1 });
```

And a simple NodeJS function which uses the request module to ping the Open Exchange Rates API and saves an FxSnapshot to the database [(github)](https://github.com/vkarpov15/mean-exchange-rates/blob/master/fx_rates.js#L4-21):

```
var refresh = function(callback) {
  console.log('Refreshing exchange rates');
  request('http://openexchangerates.org/api/latest.json?app_id=' + key,
    function(error, response, body) {
      if (error) {
        return callback(error);
      }
 
      rates = JSON.parse(body).rates;
 
      var snapshot = new FxSnapshot({ rates : rates });
      snapshot.save(function(error, snapshot) {
        // Should never fail
      });
 
      return callback(null, rates);
    });
};
```

2) Set up rules for when to query for new rates
--------------------------------

Now that we have a function to load data, the question is, how do we use it? The start of the FX trading day is 5:30 pm New York time Sunday-Thursday, with the exception of New Zealand Dollar markets, so querying once a day at 6pm is a reasonable approximation to getting the market open. We can do this using node-cron. Note that this example presumes that you are in EST - if you want to query at 6pm EST from a server in a different time zone, you need to adjust the below code accordingly. If you are not familiar with cron job syntax, the [node-cron Github repo](https://github.com/ncb000gt/node-cron) has a few examples.

```
var job = new cron.CronJob('00 00 18 * * 0-6', function() {
  refresh(function(){});
});
job.start();
```

But what happens on server restart? Our exchange rates are stored in memory and persisted to MongoDB, so if our application server crashes, we need to get the exchange rates back on restart. In addition, if our server was down at 6pm and thus didn't query for new rates, we don't want to be showing rates that are excessively stale. To take care of these issues, lets add an initialization function that will load the latest snapshot from MongoDB, and refresh if the snapshot is more than a day old:

```
var init = function(callback) {
  // Find the latest snapshot
  FxSnapshot.findOne({}).sort({ time : -1 }).exec(function(error, snapshot) {
    if (error || !snapshot) {
      refresh(callback);
    } else {
    // If data is more than 1 day stale
      if (new Date(snapshot.time).getTime() + 24 * 60 * 60 * 1000 < new Date().getTime()) {
        refresh(callback);
      } else {
        rates = snapshot.rates;
        callback(null, snapshot.rates);
      }
    }
  });
};
```

Finally, lets wrap the entire `FxRates` module in a pretty bow and make a convenient interface available to the rest of our code:

```
return {
  refresh : refresh,
  init : init,
  get : function() {
    return rates;
  }
};
```

Note that the `get()` function just returns the rates object as-is. Those not familiar with NodeJS may wonder how this can possibly be thread-safe. Conveniently, NodeJS is event-driven, so there are no threads. Without getting into too much detail about event-driven concurrency, just know that there is no way that `get()` will return a partially written version of rates, because the following code in the `refresh()` function is guaranteed to execute sequentially without any other code executing in the meantime:

```
if (error) {
  return callback(error);
}
 
rates = JSON.parse(body).rates;
 
var snapshot = new FxSnapshot({ rates : rates });
```

3) Displaying this information to the user
-------------------------

Now that we have a tool to pull exchange rates regularly, lets create a schema for the products that we're going to display [(Github)](https://github.com/vkarpov15/mean-exchange-rates/blob/master/models/Product.js#L10-17). In particular, we want to keep track of the currency's list price, so we're not tied to US Dollars.

```
exports.ProductSchema = new Mongoose.Schema({
  name : String,
  price : {
    price : Number,
    currency : String
  },
  picture : String
});
```

Lets also define a route that depends on this model and our `FxRates` module:

```
app.get('/', routes.index(FxRates, Product));
 
/*
 * GET home page
 */
exports.index = function(FxRates, Product) {
  return function(req, res) {
    // Load all products
    Product.find({}, function(error, products) {
      res.render('index', { products : products, rates : FxRates.get() });
    });
  };
};
```

And now that we've done the hard part, we can put together the [index.jade view](https://github.com/vkarpov15/mean-exchange-rates/blob/master/views/index.jade), which will have a drop-down where the user can select their preferred currency. At this point, I'd recommend you play with the code yourself - you can set up NodeJS and MongoDB as described [here](http://thecodebarbarian.com/2013/07/22/introduction-to-the-mean-stack-part-one-setting-up-your-tools/), get yourself an Open Exchange Rates API key, and run the server with

```
node app.js --key [your Open Exchange Rates API key here]
```

Conclusion
----------

Hopefully now you've seen why the MEAN stack makes it exceptionally easy to integrate multiple currency display into your site. With NodeJS, you can take advantage of event-driven I/O to write some sophisticated concurrency into your server with ease. With MongoDB, you can store semi-structured data in a form that you can query back later. Hopefully after this post, you won't be quite as intimidated as I was the first time I was asked to build out a tool to display prices in different currencies.
