[Moment](/formatting-javascript-dates-with-moment-js.html) is a popular JavaScript library for working with dates. Moment makes it easy to add, subtract, and format dates, but, by itself, Moment is limited to working with two timezones: UTC and whatever the [JavaScript runtime locale's timezone is](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset). The [moment-timezone library](https://momentjs.com/timezone/) provides the core Moment API, plus support for [IANA timezones](https://www.iana.org/time-zones).

Note that you can theoretically [format dates in arbitrary timezones with vanilla JavaScript](https://masteringjs.io/tutorials/fundamentals/date_format#timezones), but the built-in `toLocaleString()` function's supported timezones are implementation-specific. Which means that you're better off not relying on `toLocaleString()` supporting timezones in the browser.

Getting Started With moment-timezone
-------------------------------

Moment-timezone is a [separate npm module](https://www.npmjs.com/package/moment-timezone) from [moment](https://www.npmjs.com/package/moment), but [moment-timezone depends on moment under the hood](https://github.com/moment/moment-timezone/blob/063a95053afdfca0cbe8fb035271205d5f0ac417/package.json#L31). So you can install moment-timezone by itself, or both moment and moment-timezone.

Once you install moment-timezone, you can `require()` it in and use it like you would use moment.

```javascript
const moment = require('moment-timezone');

// 'Mon Jun 08 2020 17:07:46 GMT-0400'
moment().toString();
```

The moment-timezone API is, for practical purposes, a superset of the [moment API](/formatting-javascript-dates-with-moment-js.html). Virtually anything you can do with moment,
you can also do with moment-timezone. For example, date formatting:

```javascript
const moment = require('moment-timezone');

moment().format('YYYYMMDD HH:mm'); // '20200608 17:10'
```

However, moment-timezone adds a `moment.tz()` that you can use to create a
new moment object with a custom timezone. For example, here's how you can
create a moment object representing the current time in [Longyearbyen, Norway](https://en.wikipedia.org/wiki/Longyearbyen).

```javascript
// 'Tue Jun 08 2020 23:13:16 GMT+0200'
moment.tz('Arctic/Longyearbyen').toString();
```

The string `'Arctic/Longyearbyen'` is an [IANA timezone name](https://en.wikipedia.org/wiki/Tz_database).
[Wikipedia has a full list of IANA timezones](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
For example, below are 3 more common IANA timezone names:

- 'America/New_York': US Eastern time
- 'America/Los_Angeles': US Pacific time
- 'Europe/London': UK time

Formatting and Loading Dates Using `moment.tz()`
-------------------------

One of the main reasons to use moment-timezone is to convert existing dates
from a standardized format to a certain timezone. For example, given a
[Unix timestamp](https://www.unixtimestamp.com/index.php), you can convert
that timestamp to its corresponding time in London, regardless of your
machine's local time.

You can convert a Unix timestamp to a nicely formatted string in a given
timezone by passing 2 parameters to `moment.tz()`:

```javascript
// Multiply by 1000, because Unix timestamps are in seconds and
// JavaScript dates expect milliseconds.
moment.tz(1591716176 * 1000, 'Europe/London').format('YYYYMMDD HH:mm'); // '20200609 16:22'
```

Similarly, you can convert a vanilla JavaScript date into a formatted
string with a given timezone. For example, the below code outputs a
date formatted for London time, even though my machine is on New York time.

```javascript
// '20200609 16:26'
moment.tz(new Date(), 'Europe/London').format('YYYYMMDD HH:mm');
```

Moment-timezone also [adds a 'z' option to `format()`](https://momentjs.com/timezone/docs/#/using-timezones/formatting/) which lets you add the abbreviated timezone name. The below code
outputs the current timezone as 'BST', short for [British Summer Time](https://en.wikipedia.org/wiki/British_Summer_Time).


```javascript
// '20200609 16:29 BST'
moment.tz(new Date(), 'Europe/London').format('YYYYMMDD HH:mm z');
```

Note that 'z' outputs BST, **not** Europe/London. The IANA timezone Europe/London
encodes daylight savings time rules. That means, if you pass Europe/London to moment-timezone, the
'z' option can output 'GMT' or 'BST' depending on daylight savings.

```javascript
// '20200102 00:00 GMT'
moment.tz(new Date('2020-01-02'), 'Europe/London').format('YYYYMMDD HH:mm z');
```

In general, `moment.tz()` supports the same parameters as `moment()`,
plus the addition of a timezone parameter. For example, the below code
parses the date string '2020/01/02' with the given format and timezone,
giving you a moment object representing midnight on January 2, 2020
in London.

```javascript
// '20200102 00:00 GMT'
moment.tz('2020/01/02', 'YYYY/MM/DD', 'Europe/London').format('YYYYMMDD HH:mm z');

// Because of how JavaScript date parsing works, `new Date('2020/01/02')`
// gives you January 2, 2020 in the server's local time, so the below
// will give you:
// '20200102 05:00 GMT'
moment.tz(new Date('2020/01/02'), 'Europe/London').format('YYYYMMDD HH:mm z');
```

Static `tz()` vs Method `tz()`
-------------------------

A common cause of confusion is that, in addition to the static `moment.tz()`
function, moment-timezone also adds a `tz()` method to moment instances.
This lets you change the timezone of a moment instance.

```javascript
// '20200101 16:00 PST'
moment(new Date('2020-01-02')).tz('America/Los_Angeles').format('YYYYMMDD HH:mm z');
```

In many cases, using the static function `moment.tz()` and the `moment#tz()` method
gives you the same result. However, they can give different results when parsing
date strings.

For example, if you parse the string '2020/01/02' and then call the `moment#tz()`
method, you're telling moment to parse the string in the locale time, and
then convert the date to a given IANA timezone.

```javascript
// '20200101 21:00 PST'
moment('2020/01/02', 'YYYY/MM/DD').tz('America/Los_Angeles').format('YYYYMMDD HH:mm z');
```

However, if you call `moment.tz()` with a given IANA timezone, you're telling
moment to parse the string _in the given IANA timezone_, rather than in the
locale time. Notice that the below code shows the current time as exactly
midnight, rather than 21:00 ('America/Los_Angeles' is 3 hours behind New York time).

```javascript
// '20200102 00:00 PST'
moment.tz('2020/01/02', 'YYYY/MM/DD', 'America/Los_Angeles').format('YYYYMMDD HH:mm z');
```

Because of this difference, you should prefer to use `moment.tz()` when creating
new moment-timezone objects, rather than changing the timezone after creation
using the `moment#tz()` method.

When Timezones Matter
--------------

Timezones often pop up when building apps where you have objects with an
implicit location. For example, if you're building a blog, and a user posts
a comment at 5pm in London, it is arguably correct to show a user looking
at the comment in New York that the comment was posted at 12pm.

But suppose you're building an events platform. If an event is happening
at 5pm in London and that event isn't being streamed online, a user in
New York should still see 5pm. If the expectation is that, if you are
participating in the event, you will be in London, then showing London
time regardless of the user's current location is the correct behavior.

Moving On
---------

[Moment-timezone](https://www.npmjs.com/package/moment-timezone) is a great library for handling times in different timezones. Given a Unix timestamp or a date string, you can convert it to a
fully fledged moment object in any IANA timezone. No need to worry about daylight savings time.