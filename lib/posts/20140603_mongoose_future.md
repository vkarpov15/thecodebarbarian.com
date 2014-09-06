Two weeks ago marked a big milestone: [mongoose 3.9.0](https://github.com/LearnBoost/mongoose/blob/master/History.md#390-unstable--2014-05-22) was released. Be warned, mongoose's versioning practice is that even numbered branches are stable and odd are unstable. While all our tests check out on 3.9.0, I would recommend sticking to 3.8.x releases in production for now. 3.9.0 was mongoose's first unstable release since October 2013. While the changes in 3.9.0 were relatively minor, they open the door to getting some interesting features into 4.0. Here are some of the high-level features I think should make it in to 4.0:

1) Update() with Validators
---------------------------

Mongoose right now doesn't run validators on calls to `Model.update()`. I've found often that its more elegant and performant to [call `update()` directly](https://github.com/vkarpov15/lean-mean-nutrition-sample/blob/master/routes/api.js#L42-63) instead of loading the document, modifying it, and then saving it. Mongoose should have better support for this paradigm in the future.

2) Browser-friendly and browserify-friendly schema validation module.
---------------------------------

Currently, there's no good way to send your schemas to the browser to do client-side validation. While introducing an [API endpoint for validation](http://thecodebarbarian.com/2013/05/12/how-to-easily-validate-any-form-ever-using-angularjs/) is quite possible, hooking up mongoose schema validation directly to a tool like AngularJS in the browser can open up some incredibly cool opportunities.

3) Better integration with [Koa.js](http://koajs.com/) and [Harmony](http://en.wikipedia.org/wiki/ECMAScript#ECMAScript_Harmony_.286th_Edition.29) in general
------------------------------------

Fair warning, I'm not well versed in the particulars of ES6 or Koa just yet, but I have noticed some people opening Github issues related to these subjects. As more people start moving to ES6, mongoose needs to have its A-game ready.

[<img src="http://thecodebarbarian.files.wordpress.com/2014/06/harmony_is_coming.jpg?w=199&h=300">](http://thecodebarbarian.files.wordpress.com/2014/06/harmony_is_coming.jpg?w=199&h=300)

4) [Per-document events](https://github.com/LearnBoost/mongoose/issues/2090)
----------------------

The general idea is that mongoose doesn't scope document events to a particular document, that is, `doc1.on('event')` will get triggered by `doc2.emit('event')` if `doc1` and `doc2` are instances of the same model. This is expected behavior now, but its very counterintuitive. At the very least, in 4.0 `doc1.on('event')` will get triggered by `doc2.emit('event')` if doc1 and doc2 are the same JS object. However, we may introduce behavior where `doc1.on('event')` will get triggered by `doc2.emit('event')` if `doc1` and `doc2` have the same `_id`.

5) Reworking Population
-----------------------

Populate is extremely useful, but also has some very unfortunate dark corners and counter-intuitive behavior that I'd like to rework. There are numerous features, such as caching integration, [manual population](https://github.com/LearnBoost/mongoose/issues/2075), and populating on [fields other than _id](https://github.com/LearnBoost/mongoose/issues/1888) that the current implementation makes very difficult. I'm hoping to get all these features into 4.0.

Conclusion
----------

I'm still very much in the planning stages for mongoose 4.0, so comments, concerns, and feature suggestions are very much welcome. Feel free to open up [issues on Github](https://github.com/LearnBoost/mongoose/issues) with features you'd like to see in 4.0.
