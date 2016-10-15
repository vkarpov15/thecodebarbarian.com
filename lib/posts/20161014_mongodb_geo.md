MongoDB's powerful built-in geospatial queries are one of the big reasons
why I made it my database of choice. After the old days of struggling with
PostGIS or the really old days of implementing the Haversine formula myself
in MySQL, having [geospatial operators and indexes built-in](https://docs.mongodb.com/manual/applications/geospatial-indexes/) was
a breath of fresh air. However, the MongoDB geospatial querying docs often miss
the forest for the trees. In this article, I'll focus specifically on [GeoJSON](http://geojson.org/) queries in the MongoDB shell and how to implement
several common geospatial queries in MongoDB.

Which documents are in a given polygon?
---------------------------------------

The simplest geospatial operator is [`$geoIntersects`](https://docs.mongodb.com/manual/reference/operator/query/geoIntersects/). Given a GeoJSON polygon, `$geoIntersects` will give you all
documents whose GeoJSON geometries intersect with the polygon. Suppose you have
a list of ski resorts in a `locations` collection:

```
> db.locations.find().pretty()
{
	"_id" : ObjectId("5801594c4067070bfcb01293"),
	"name" : "Squaw Valley",
	"location" : {
		"type" : "Point",
		"coordinates" : [
			-120.24,
			39.21
		]
	}
}
{
	"_id" : ObjectId("580159634067070bfcb01294"),
	"name" : "Mammoth Lakes",
	"location" : {
		"type" : "Point",
		"coordinates" : [
			-118.9,
			37.61
		]
	}
}
{
	"_id" : ObjectId("580159d94067070bfcb01295"),
	"name" : "Aspen",
	"location" : {
		"type" : "Point",
		"coordinates" : [
			-106.82,
			39.18
		]
	}
}
{
	"_id" : ObjectId("58015a704067070bfcb01296"),
	"name" : "Whistler",
	"location" : {
		"type" : "Point",
		"coordinates" : [
			-122.95,
			50.12
		]
	}
}
```

How many of these locations are in the state of Colorado? Let's approximate
Colorado as the below GeoJSON square.

```
{
  "type": "Polygon",
  "coordinates": [[
    [-109, 41],
    [-102, 41],
    [-102, 37],
    [-109, 37],
    [-109, 41]
  ]]
}
```

Here's how these geometries look on a map. Click on the map for an interactive
view.

<a href="http://bl.ocks.org/anonymous/raw/a297439e02cad4ae5c41ed9e1d89b344/">
<img src="http://i.imgur.com/59OCqJR.jpg" />
</a>

Here's what this query looks like in the MongoDB shell:

```
> db.locations.find({
...   location: {
...     $geoIntersects: {
...       $geometry: {
...         type: "Polygon",
...         coordinates: [[
...           [-109, 41],
...           [-102, 41],
...           [-102, 37],
...           [-109, 37],
...           [-109, 41]
...         ]]
...       }
...     }
...   }
... })
{ "_id" : ObjectId("580159d94067070bfcb01295"), "name" : "Aspen", "location" : { "type" : "Point", "coordinates" : [ -106.82, 39.18 ] } }
>
```

As expected, MongoDB managed to figure out that Aspen is in Colorado, and
Squaw Valley, Mammoth Lakes, and Whistler are not. This query is not terribly
enlightening, but if you start importing data like [US zip codes and counties](https://github.com/jgoodall/us-maps) MongoDB can start looking like
your own personal [non-rate-limited geocoder](https://developers.google.com/maps/faq#usage-limits).

The `$geometry` property under `$geoIntersects` is required for the
`$geoIntersects` operator, but not for the other geospatial operators you'll
learn about later. For now, just think of it as boilerplate.

Which documents are within a certain distance of a given point?
---------------------------------------------------------------

One big GeoJSON limitation is that it [can't represent circles](http://stackoverflow.com/questions/16942697/geojson-circles-supported-or-not). That's a problem if you want to, say, find all ski resorts within 300
miles of San Francisco and avoid having to fly. The `$geoIntersects` operator
won't help you here, but the [`$geoWithin` operator](https://docs.mongodb.com/manual/reference/operator/query/geoWithin/) will.

The `$geoWithin` operator is similar to `$geoIntersects`. You can replace
`$geoIntersects` with `$geoWithin` in the "find documents in Colorado" query
and get the same result.

```
> db.locations.find({
...   location: {
...     $geoWithin: {
...       $geometry: {
...         type: "Polygon",
...         coordinates: [[
...           [-109, 41],
...           [-102, 41],
...           [-102, 37],
...           [-109, 37],
...           [-109, 41]
...         ]]
...       }
...     }
...   }
... })
{ "_id" : ObjectId("580159d94067070bfcb01295"), "name" : "Aspen", "location" : { "type" : "Point", "coordinates" : [ -106.82, 39.18 ] } }
```

The `$geoWithin` operator and the `$geoIntersects` operator have 2 key
differences:

* `$geoWithin` searches for geometries that are contained entirely within a given geometry, whereas `$geoIntersects` looks for geometries that intersect. If the property you're searching for contains points, these are the same, but the results may differ if your documents contain polygons. More on this later.
* `$geoWithin` supports several shape operators in addition to `$geometry`, including `$centerSphere`, which is the right way to do a "find all documents within 300 miles of San Francisco" query.

It's tricky to visualize a circle of radius 300 miles with a GeoJSON visualizer,
but here's how the ski resorts look with a square of [circumradius](http://mathworld.wolfram.com/Circumradius.html) 300 miles centered on San Francisco (approximately latitude 37.7, longitude -122.5):

<a href="http://bl.ocks.org/anonymous/raw/5e33ac4eb082b1c37684319905e26566/">
	<img src="http://i.imgur.com/7Oanv3z.jpg" />
</a>

So the expected result is 2 documents, Mammoth Lakes and Squaw Valley.
Here's how the MongoDB query with `$geoWithin` and `$centerSphere` looks:

```
> db.locations.find({
...   location: {
...     $geoWithin: {
...       $centerSphere: [[-122.5, 37.7], 300 / 3963.2]
...     }
...   }
... })
{ "_id" : ObjectId("5801594c4067070bfcb01293"), "name" : "Squaw Valley", "location" : { "type" : "Point", "coordinates" : [ -120.24, 39.21 ] } }
{ "_id" : ObjectId("580159634067070bfcb01294"), "name" : "Mammoth Lakes", "location" : { "type" : "Point", "coordinates" : [ -118.9, 37.61 ] } }
>
```

What's with the crazy 3963.2 magic number? `$centerSphere` takes the distance
in radians, so you need to divide by the radius of the Earth, which is
about [3963.2 miles at the equator](https://en.wikipedia.org/wiki/Earth_radius#Fixed_radius). This estimate
is usually good enough because the Earth's radius [only has a range of about 20 miles](https://en.wikipedia.org/wiki/Earth_radius#Notable_geocentric_radii).

How do I sort documents by distance from a given point?
-------------------------------------------------------

The `$geoWithin` query above gives you all documents within 300 miles of San
Francisco, but those documents can be in any order. Let's say you wanted to
find all documents within 900 miles of San Francisco and order then by distance.
Using Node.js and the [turf](https://www.npmjs.com/package/turf) module, you'll see that Whistler is just over 900
miles away from the point we've chosen to represent San Francisco, and Aspen
is just under 900 miles away:

```
$ node
> var turf = require('turf')
undefined
> turf.distance(turf.point([-122.5, 37.1]), turf.point([-106.82, 39.18]), 'miles')
863.2551069982414
> turf.distance(turf.point([-122.5, 37.1]), turf.point([-122.95, 50.12]), 'miles')
900.1549979044975
>
```

The way to run this query in MongoDB is the
[`$nearSphere` operator](https://docs.mongodb.com/manual/reference/operator/query/nearSphere/).
The `$nearSphere` operator requires you to create a [2dsphere index](https://docs.mongodb.com/manual/core/2dsphere/). Here's how that looks
in the MongoDB shell:

```
> db.locations.ensureIndex({ location: '2dsphere' })
{
	"createdCollectionAutomatically" : false,
	"numIndexesBefore" : 1,
	"numIndexesAfter" : 2,
	"ok" : 1
}
```


The `$nearSphere` operator takes a `$geometry` property that's a GeoJSON point, and `$minDistance` and `$maxDistance` properties that are in **meters**.

```
> db.locations.find({
...   location: {
...     $nearSphere: {
...       $geometry: {
...         type: 'Point',
...         coordinates: [-122.5, 37.1]
...       },
...       $maxDistance: 900 * 1609.34
...     }
...   }
... })
{ "_id" : ObjectId("5801594c4067070bfcb01293"), "name" : "Squaw Valley", "location" : { "type" : "Point", "coordinates" : [ -120.24, 39.21 ] } }
{ "_id" : ObjectId("580159634067070bfcb01294"), "name" : "Mammoth Lakes", "location" : { "type" : "Point", "coordinates" : [ -118.9, 37.61 ] } }
{ "_id" : ObjectId("580159d94067070bfcb01295"), "name" : "Aspen", "location" : { "type" : "Point", "coordinates" : [ -106.82, 39.18 ] } }
>
```

The 1609.34 multiplier converts from [miles to meters](http://www.metric-conversions.org/length/miles-to-meters-table.htm).
You can also specify `$minDistance`.

What if, in addition to sorting by distance, you want MongoDB to compute the
actual distance for you too? The [MongoDB aggregation framework](https://docs.mongodb.com/manual/aggregation/) has a [`$geoNear` stage](https://docs.mongodb.com/v3.0/reference/operator/aggregation/geoNear/) which behaves pretty similarly to `$nearSphere`. The difference between `$nearSphere` and `$geoNear` is a common source of confusion. Usually, if you
want to execute a query you use `$nearSphere`, and if you want to use the
aggregation framework, you need to use `$geoNear`.

`$geoNear` is an aggregation framework stage that takes in several properties:

* `near`, which is the GeoJSON point
* `spherical`, which must be true if you're using a 2dsphere index (and you should use a 2dsphere index rather than a 2d index unless you have a good reason)
* `maxDistance` and `minDistance`, in meters
* `distanceField` and `distanceMultiplier`, which are the field to put the computed distance in and the factor to multiply it by.

Here's the "order ski locations within 900 miles of San Francisco by distance and print the computed distance" query. Note that `maxDistance` is in meters, so
we need to multiply 900 by 1609.34, and then divide again by 1609.34 so the
computed `distanceFromSF` is in miles.

```
> db.locations.aggregate([{
...   $geoNear: {
...     near: {
...       type: 'Point',
...       coordinates: [-122.5, 37.1]
...     },
...     spherical: true,
...     maxDistance: 900 * 1609.34,
...     distanceMultiplier: 1 / 1609.34,
...     distanceField: 'distanceFromSF'
...   }
... }])
{ "_id" : ObjectId("5801594c4067070bfcb01293"), "name" : "Squaw Valley", "location" : { "type" : "Point", "coordinates" : [ -120.24, 39.21 ] }, "distanceFromSF" : 190.80440056422898 }
{ "_id" : ObjectId("580159634067070bfcb01294"), "name" : "Mammoth Lakes", "location" : { "type" : "Point", "coordinates" : [ -118.9, 37.61 ] }, "distanceFromSF" : 201.0443259531628 }
{ "_id" : ObjectId("580159d94067070bfcb01295"), "name" : "Aspen", "location" : { "type" : "Point", "coordinates" : [ -106.82, 39.18 ] }, "distanceFromSF" : 863.9477714789235 }
```

**Protip:** Always test your queries carefully, don't just define a big polygon
and check if your geospatial query returns all documents. I've been using
geospatial queries for years and I still forget which units the various
geospatial operators use in which versions of MongoDB. This data set would make
a good test case, because Whistler is slightly more than 900 miles away and
Aspen is slightly less. A good test case would take in 900 and assert that
Aspen is in the results and Whistler is not.

Which polygons are within X miles of a given point?
-----------------------------------------------------

MongoDB geospatial operators work with 2 GeoJSON types: points and polygons.
Note that MongoDB geospatial operators do **not** work with GeoJSON features
or feature collections. To stick with our current data set, let's create a
'states' collection that contains the minimal polygon for Colorado:

```
> db.states.find().pretty()
{
	"_id" : ObjectId("5801739adefd3a67cca15eae"),
	"geometry" : {
		"type" : "Polygon",
		"coordinates" : [
			[
				[
					-109,
					41
				],
				[
					-102,
					41
				],
				[
					-102,
					37
				],
				[
					-109,
					37
				],
				[
					-109,
					41
				]
			]
		]
	}
}
>
```

We know that the entirety of Colorado is not within 900 miles of San Francisco,
but part of it is. To find all polygons that intersect with a 900 mile circle
centered at San Francisco, you need to use the `$nearSphere` operator
(which, remember, requires a '2dsphere' index).

```
> db.states.find({
...   geometry: {
...     $nearSphere: {
...       $geometry: {
...         type: 'Point',
...         coordinates: [-122.5, 37.1]
...       },
...       $maxDistance: 900 * 1609.34
...     }
...   }
... })
{ "_id" : ObjectId("5801739adefd3a67cca15eae"), "geometry" : { "type" : "Polygon", "coordinates" : [ [ [ -109, 41 ], [ -102, 41 ], [ -102, 37 ], [ -109, 37 ], [ -109, 41 ] ] ] } }
>
```

To double check, try running the query with 500 miles and see that you get
no results:

```
> db.states.find({
...   geometry: {
...     $nearSphere: {
...       $geometry: {
...         type: 'Point',
...         coordinates: [-122.5, 37.1]
...       },
...       $maxDistance: 500 * 1609.34
...     }
...   }
... })
>
```

Side Note on Self-Intersecting Polygons
---------------------------------------

[MongoDB does **not** support self-intersecting polygons](https://jira.mongodb.org/browse/SERVER-20672). You can store these
in MongoDB but geospatial query operators can't search through them and your
2dsphere index builds will fail if you have self-intersecting polygons in
your collection. These are surprisingly
common in [US zip code data](https://www.google.com/maps/place/Fred,+TX+77616/@30.5530819,-94.2834776,14.5z/data=!4m5!3m4!1s0x863910db5b73e1d7:0xd21eaba7f50af4d2!8m2!3d30.585557!4d-94.2435893), so make sure you [sanitize your data](https://www.npmjs.com/package/turf-kinks) first.

Moving On
---------

MongoDB geospatial queries let you solve many common geo-related tasks with
no extra tools or plugins. At [Booster](https://www.boosterfuels.com/join-the-team), we briefly considered various geocoding
API's before finding their rate limits too stringent and their reliability
wanting, and just ended up importing state and zip code polygons into MongoDB.
If geospatial is as core a part of your business as it is for us, MongoDB's the
only way to go.
