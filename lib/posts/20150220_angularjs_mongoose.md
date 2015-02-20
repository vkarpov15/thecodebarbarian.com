People have often asked me about my biggest pain points with AngularJS.
I don't have many complaints about AngularJS 1.x. But, my biggest by far is the [form validation code](https://code.angularjs.org/1.2.16/docs/api/ng/directive/form). Besides being unwieldy, it has a fundamental flaw: writing form validation logic in HTML is wrong. I wrote about a better way to [handle form validation using Mongoose on the server side](/2013/05/12/how-to-easily-validate-any-form-ever-using-angularjs) two years ago. In this article, I'll present a more modern approach using [Mongoose](http://www.mongoosejs.com) 4.0.0-rc2's isomorphic component.

What's Wrong With `ngForm`?
===========================

Now don't get me wrong, the ability to call scope functions in HTML is an awesome feature. But using it to define form validation logic has three key disadvantages. First, it breaks separation of concerns. Form validation logic should operate on data (a plain-old JavaScript object, or POJO for short) as opposed to the state of HTML inputs. In other words, if a designer decides to change an `input` to a `select`, this should not affect the validation code at all. Secondly, it's tricky to control when form validation is executed. You might want to only run validation when an input element uses focus, but AngularJS runs it on every change by default. Even I'm not quite comfortable with tweaking that behavior, and I [wrote a ~400 page book on AngularJS](http://www.amazon.com/Professional-AngularJS-Valeri-Karpov/dp/1118832078/ref=sr_1_1?ie=UTF8&qid=1424385919&sr=8-1&keywords=professional+angularjs). I can only imagine how beginners struggle with that.

Lastly, in-HTML form validation logic fails to take advantage of isomorphism. In other words, its difficult to run your HTML form validation logic on the server. This means you need to write validation logic in two separate languages, a violation of the core MEAN stack principle "thou shalt not maintain the same code in 2 different languages." If you're using Mongoose to validate data on the server, why not use the same validation logic in the browser?

Enter Mongoose's Browser Component
==================================

As you may know, Mongoose is a ORM-like layer (ODM) for NodeJS and MongoDB.
By virtue of the fact that MongoDB has no notion of a schema, Mongoose has built up a rich set of validation functionality over the years.
A couple years ago I described how to [integrate AngularJS with Mongoose server-side validation output](/2013/05/12/how-to-easily-validate-any-form-ever-using-angularjs).
But, its 2015, and "isomorphic JavaScript" is the new buzzword.
Mongoose is written in pure JavaScript, so it could be isomorphic in theory.
Since 3.9.6, Mongoose supports limited isomorphism. Specifically, Mongoose 4.0.0-rc2's isomorphic component packages Mongoose's schema validation for the browser.

To use Mongoose's browser component, you can include the [pre-built source in a `script` tag](http://d1l4stvdmqmdzl.cloudfront.net/4.0.0-rc2/mongoose.min.js). You can also `require('mongoose')` in code you'll build with [browserify](https://www.npmjs.org/package/browserify). Once you've included Mongoose in your page, you should be able to run the below simple example. You can find [this example on JSFiddle](http://jsfiddle.net/tq6rgodt/).

```javascript
var schema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    }
});

var doc = new mongoose.Document({}, schema);

doc.validate(function(err) {
    print('Validation error: ' + err);
    doc.name = 'Val';
    doc.validate(function(err) {
        print('No more error: ' + err); 
    });
});
```

The above example doesn't look like anything special. But, you now have the ability to utilize advanced Mongoose features, like [custom validators](http://mongoosejs.com/docs/validation.html), [pre and post validate middleware](http://mongoosejs.com/docs/middleware.html), [virtuals](http://mongoosejs.com/docs/2.7.x/docs/virtuals.html), and [plugins](http://mongoosejs.com/docs/plugins.html).

*Mongoose makes heavy use of [the `Object.defineProperty` function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty) in ECMAScript 5. As such, the browser component is not expected to work in browsers that don't support ECMAScript 5. This [includes Internet Explorer 8 and Safari 4](http://kangax.github.io/compat-table/es5/). I have not tested to see if Mongoose works in IE8 with an ES5 shim yet.*

Using Mongoose Custom Validators in the Browser
======================================

Suppose you have a document that contains a list of prime numbers. Mongoose doesn't include a validator for checking if a number is prime (although I'm [open to a pull request with a performant implementation](http://en.wikipedia.org/wiki/Adleman%E2%80%93Pomerance%E2%80%93Rumely_primality_test)). Custom validators let you define your own primality test ([JSFiddle](http://jsfiddle.net/368an924/1/)):

```javascript
var primeNumbersSchema = new mongoose.Schema({
    primes: [{
        type: Number,
        min: 2,
        validate: {
            validator: function(v) {
                for (var i = 2; i <= Math.sqrt(v); ++i) {
                    if (v % i === 0) {
                        return false;
                    }
                }
                return true;
            },
            msg: '{VALUE} is not prime!'
        }
    }]
});

var doc = new mongoose.Document({ primes: [2] }, primeNumbersSchema);

/*
 * Output looks like:
 * No validation error: null
 * Error: ValidationError: 4 is not prime! 
 */
doc.validate(function(err) {
    print('No validation error: ' + err);
    doc.primes.push(4);
    doc.validate(function(err) {
        print('Error: ' + err); 
    });
});
```

Tying in AngularJS
==================

When I wrote about [how to validate any form ever with AngularJS](/2013/05/12/how-to-easily-validate-any-form-ever-using-angularjs), I defined a non-trivial schema describing a list of stocks.

```javascript
var stockSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    enum: VALID_SYMBOLS
  },
  price: {
    price: {
      type: Number,
      required: true,
      min: 0
    },
    currency : {
      type: String,
      required: true,
      enum: CURRENCIES
    }
  },
  quantity : {
    type: Number,
    required: true,
    min: 0
  }
});

stockSchema.virtual('displayPrice').get(function() {
  return this.price.currency + ' ' + this.price.price;
});

var stockListSchema = new mongoose.Schema({
  stocks: [stockSchema]
});
```

The `stockListSchema` uses Mongoose's ability to nest schemas, so each element in `stocks` needs to match `stockSchema`. To fit into `stockSchema`, a document must have a `symbol`, `price.price`, `price.currency`, and `quantity`. The symbol and currency must be one of the allowed values specified in `VALID_SYMBOLS` and `CURRENCIES`, respectively.

Here's the JavaScript you need to tie `stockListSchema` in with AngularJS and bypass the need for an HTTP call. You can read the below code or skip ahead to the [JSFiddle](http://jsfiddle.net/3d0405jc/3/).

```javascript
var mongooseExample = angular.module('mongooseExample', []);

mongooseExample.controller('TestController', function($scope) {
    $scope.stockList = new mongoose.Document({}, stockListSchema);
    $scope.validationError = null;
    
    $scope.resetInput = function() {
        $scope.newStock = new mongoose.Document({}, stockSchema);
    };
    $scope.resetInput();
    $scope.VALID_SYMBOLS = VALID_SYMBOLS;
    $scope.CURRENCIES = CURRENCIES;
    
    $scope.saveStock = function() {
        $scope.validationError = null;
        $scope.newStock.validate(function(err) {
            if (err) {
                $scope.validationError = err;
                return $scope.$apply();
            }
            $scope.stockList.stocks.push($scope.newStock);
            $scope.resetInput();
            $scope.$apply();
        });
    };
});
```

Utilizing this controller in HTML is easy. You create `input` and `select` elements that AngularJS binds to your `newStock` Mongoose document. When the user clicks "Add Stock", you use Mongoose to validate `newStock`. If its invalid, you make the validation errors visible to the `$scope`, so AngularJS can show the correct `div` elements with class 'error'. If `newStock` is valid, you push the document onto the stock list and clear the input for the user.

```javascript
<div ng-app="mongooseExample">  
    <div ng-controller="TestController">
        <h2>Add New Stock</h2>
        <h4>Symbol</h4>
        <select ng-model="newStock.symbol" ng-options="symbol for symbol in VALID_SYMBOLS">
        </select>
        <div ng-if="validationError.errors['symbol'].kind" class="error">
            {{validationError.errors['symbol'].message}}
        </div>
        <h4>Price</h4>
        <select ng-model="newStock.price.currency" ng-options="currency for currency in CURRENCIES">
        </select>
        <input type="number" ng-model="newStock.price.price" />
        <div ng-if="validationError.errors['price.price'].kind" class="error">
            {{validationError.errors['price.price'].message}}
        </div>
        <div ng-if="validationError.errors['price.currency'].kind" class="error">
            {{validationError.errors['price.currency'].message}}
        </div>
        <h4>Quantity</h4>
        <input type="number" ng-model="newStock.quantity" />
        <div ng-if="validationError.errors['quantity'].kind" class="error">
            {{validationError.errors['quantity'].message}}
        </div>
        <br />
        <input type="submit" ng-click="saveStock()" value="Add Stock" />
        <hr />
        <h2>List of Stocks</h2>
        <div ng-repeat="stock in stockList.stocks">
            {{stock.symbol}} @ {{stock.displayPrice}}
        </div>
    </div>
</div>
```

Conclusion
===========

I hope you realize how sweet Mongoose's browser component is. It's so cool that [it's already used in production with AngularJS](https://m.bookalokal.com/) and it isn't even marked stable yet. If you're using the MEAN stack, this will make your apps faster (no need for HTTP calls to do server-side validation) as well as easier to maintain (one schema, one definitive source of what constitutes valid data). In addition, mobile web sites and [hybrid mobile apps](http://ionicframework.com/) can now use Mongoose validation without an internet connection. Admit it: there is almost certainly a time when you did validation on the client that you didn't do on the server, or vice versa. Mongoose makes that sort of mistake a relic of the past.

*If you liked this article, check out my upcoming book,
[Professional AngularJS](http://www.amazon.com/Professional-AngularJS-Valeri-Karpov/dp/1118832078/ref=sr_1_1?ie=UTF8&qid=1421864096&sr=8-1&keywords=professional+angularjs).
Chapter 10 contains a more detailed overview of using Mongoose with AngularJS. Chapter 10 also contains an introduction to the [Ionic Framework](http://ionicframework.com/) (partially written by the author of the [Yeoman Ionic generator](https://github.com/diegonetto/generator-ionic)) and an overview of [AngularUI Bootstrap](http://angular-ui.github.io/bootstrap/).*

[<img src="//i.imgur.com/0UWUUOd.jpg">](http://www.amazon.com/Professional-AngularJS-Valeri-Karpov/dp/1118832078/ref=sr_1_1?ie=UTF8&qid=1421864096&sr=8-1&keywords=professional+angularjs)