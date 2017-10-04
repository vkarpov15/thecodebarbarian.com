[GeoJSON](https://en.wikipedia.org/wiki/GeoJSON) is a powerful standard for
expressing points, lines, polygons, and other shapes on a map. Node.js has
particularly good support for geospatial analysis with GeoJSON because of
the [turf library](https://www.npmjs.com/package/@turf/turf). GeoJSON
objects are deeply nested objects. For example, below is a polygon that
roughly approximates the state of Colorado.

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

Here's what this polygon looks like on a map. Click on the map for an
interactive view.

<a href="http://bl.ocks.org/d/da577b1847d8764999d2d5950246a8b4"><img src="https://i.imgur.com/5aMFI8k.jpg"></a>

However, to plug this GeoJSON polygon into the map builder at
[GeoJSON.io](https://geojson.io) you'll want to use a
[GeoJSON FeatureCollection](https://macwright.org/2015/03/23/geojson-second-bite.html#featurecollection),
which is an even more complex JSON object.

```
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-109, 41],
          [-102, 41],
          [-102, 37],
          [-109, 37],
          [-109, 41]
        ]]
      }
    }
  ]
}
```

The hard part of GeoJSON is wrestling with how deeply nested the types are.
Some tools, like [turf](https://www.npmjs.com/package/@turf/turf), mostly
accept GeoJSON Features and FeatureCollections as input. Other tools, like
[MongoDB's built-in geospatial queries](http://thecodebarbarian.com/80-20-guide-to-mongodb-geospatial-queries),
don't support Features or FeatureCollections at all.

Validating GeoJSON coming in over an HTTP API was one of the major reasons why
we wrote [Archetype](https://www.npmjs.com/package/archetype).
Building GeoJSON types for [JSON schema](https://www.npmjs.com/package/ajv) or
[joi](https://www.npmjs.com/package/joi) seemed like trying to paint the Mona Lisa
with a rotting fish. Here's how GeoJSON casting and validation works in Archetype.

Coordinates and Polygons
------------------------

Here's how a GeoJSON polygon would look in Archetype:

```javascript
const Archetype = require('archetype');
const assert = require('assert');

const PolygonType = new Archetype({
  type: {
    $type: 'string',
    $required: true,
    // `type` must always be polygon, and will be set by default if not set
    $default: 'Polygon',
    $enum: ['Polygon']
  },
  coordinates: {
    $type: [[['number']]],
    $required: true,
    $validate: polygon => {
      // Throw an error if a coordinate pair doesn't have length 2
      polygon.forEach(ring => {
        ring.forEach(coordinatePair => {
          assert.equal(coordinatePair.length, 2,
            `${coordinatePair} must have length 2`)
        });
      });
    }
  }
}).compile('Polygon');
```

Archetype will attach a default type of 'Polygon' and automatically convert
strings into numbers for you if you accidentally pass a number in the
coordinates array. Note that Archetype will **not** accept `NaN` as a number,
so if one of the coordinates is something that can't resolve to a number,
Archetype will throw an error.

```javascript
console.log(new PolygonType({
  // Will automatically add a `type` property with value `Polygon`
  coordinates: [[
    ['-109', 41], // Archetype will also coerce strings into numbers
    [-102, 41],
    [-102, 37],
    [-109, 37],
    [-109, '41']
  ]]
}));
```

Incorrectly formatted coordinates or an incorrect type will throw an error:

```javascript
// Error: coordinates.0.0.1: Could not cast "not a number" to number,
// type: Value "MultiPolygon" invalid, allowed values are "[ 'Polygon' ]"
new PolygonType({
  type: 'MultiPolygon',
  coordinates: [[
    [-109, 'not a number'], // <- Error, not a number
    [-102, 41],
    [-102, 37],
    [-109, 37],
    [-109, 41]
  ]]
});
```

Archetype throws errors rather than returning errors, so `new PolygonType({})`
will throw an error because `coordinates` must be set and has no `$default`.
This is for easier integration with [async/await](http://thecodebarbarian.com/common-async-await-design-patterns-in-node.js) so you don't have to put `if (err) { return err; }` lines everywhere. Leave [Go programmers](https://blog.golang.org/error-handling-and-go) to struggle with that sadistic anti-pattern. In server-side JavaScript, we consolidate error handling and shun rote boilerplate like that.

Features and Type Composition
-----------------------------

Archetype has 3 key design tenants: it is designed to be composable, inspectable, and extendable. The "composable" principle is reflected in Archetype's
custom types API, in that you can build up archetypes from smaller archetypes.
For example, let's say you wanted to build a `PolygonFeatureType` that represents a
GeoJSON Feature that contains a polygon. You can reuse the existing `PolygonType`:

```javascript
const PolygonFeatureType = new Archetype({
  type: {
    $type: 'string',
    $required: true,
    // Must always be 'Feature'
    $default: 'Feature',
    $enum: ['Feature']
  },
  properties: {
    // `$type: Object` means `properties` is an arbitrary object. No casting
    // or validation is done on its properties.
    $type: Object,
    // `$default` can also be a function
    $default: () => ({}),
    $required: true
  },
  geometry: {
    // Perfectly valid. This is what we mean by "composable": an archetype
    // can contain properties whose values must conform to a different archetype.
    $type: PolygonType,
    $required: true
  }
}).compile('PolygonFeatureType');
```

Better yet, you can use a helper function to generate Feature types for the various GeoJSON types:

* Point
* LineString
* Polygon
* MultiPolygon
* MultiLineString

```javascript
const Feature = GeoJSONType => new Archetype({
  type: {
    $type: 'string',
    $required: true,
    // Must always be 'Feature'
    $default: 'Feature',
    $enum: ['Feature']
  },
  properties: {
    // `$type: Object` means `properties` is an arbitrary object. No casting
    // or validation is done on its properties.
    $type: Object,
    // `$default` can also be a function
    $default: () => ({}),
    $required: true
  },
  geometry: {
    // Perfectly valid. This is what we mean by "composable": an archetype
    // can contain properties whose values must conform to a different archetype.
    $type: GeoJSONType,
    $required: true
  }
}).compile(`Feature<${GeoJSONType.name}`);
```

Here's how you use the above `Feature()` function:

```javascript
const FeaturePolygonType = Feature(PolygonType);

console.log(require('util').inspect(new FeaturePolygonType({
  geometry: {
    coordinates: [[
      [-109, 41],
      [-102, 41],
      [-102, 37],
      [-109, 37],
      [-109, 41]
    ]]
  }
}), { depth: 10 }));
```

The output looks like this:

```
Feature<Polygon> {
  geometry:
   Polygon {
     coordinates:
      [ [ [ -109, 41 ],
          [ -102, 41 ],
          [ -102, 37 ],
          [ -109, 37 ],
          [ -109, 41 ] ] ],
     type: 'Polygon' },
  type: 'Feature',
  properties: {} }
```

You can think of this `Feature()` function as [generics](https://en.wikipedia.org/wiki/Generics_in_Java)
for runtime type casting. The difference is, of course, generics are only
for static type checking, whereas archetype is about runtime casting of
potentially unsafe data.

Moving On
---------

[Archetype](https://www.npmjs.com/package/archetype) has been casting every API call for us for the last year. Time and
again, its proven to be head and shoulders above every other Node.js validation
library because of its principled expressiveness. Follow [Archetype on Twitter](https://twitter.com/archetype_js) for updates!
