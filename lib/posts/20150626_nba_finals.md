The NBA Finals just concluded last week, and LeBron James officially has
the dubious honor of being tied for the 5th most NBA Finals loses in history.
However, watching Game 6 last week, I found myself wondering whether any other
player had lost twice with at least 2 different franchises. Sounds like a job
for the [MongoDB aggregation framework!](http://docs.mongodb.org/manual/core/aggregation-introduction/)

The [data set for this post](https://s3.amazonaws.com/valeri.karpov.mongodb/nba.finals.json.gz)
is available on Amazon S3. The data is a JSON array that contains one JSON
object for each NBA finals. Each object contains the year, the winning team,
the losing team, the MVP, and the names of the players on each side. In
investigating this data, you'll learn about the MongoDB aggregation framework,
figure out some fun NBA finals minutae, and answer the question about LeBron
James' prolific losing.

```
{
	"_id" : ObjectId("558c6b8b8262b87939324592"),
	"year" : "2015",
	"winner" : "Golden State Warriors",
	"loser" : "Cleveland Cavaliers",
	"mvp" : "A. Iguodala",
	"winnerRoster" : [
		"Andrew Bogut",
		"David Lee",
		"Stephen Curry",
		"Brandon Rush",
		"Harrison Barnes",
		"Klay Thompson",
		"Festus Ezeli",
		"Draymond Green",
		"Justin Holiday",
		"Andre Iguodala",
		"Shaun Livingston",
		"Marreese Speights",
		"Ognjen Kuzmic",
		"Leandro Barbosa",
		"James Michael McAdoo"
	],
	"loserRoster" : [
		"Brendan Haywood",
		"Anderson Varejao",
		"Kyrie Irving",
		"Tristan Thompson",
		"Shawn Marion",
		"LeBron James",
		"Mike Miller",
		"James Jones",
		"Kevin Love",
		"Iman Shumpert",
		"J.R. Smith",
		"Timofey Mozgov",
		"Matthew Dellavedova",
		"Joe Harris",
		"Kendrick Perkins"
	]
}
```

The preferred way to import a JSON array into MongoDB is
[mongoimport](http://docs.mongodb.org/manual/reference/program/mongoimport/),
which comes packaged with MongoDB. The command I used to import this data is
`gunzip output.json.gz && mongoimport --jsonArray --db=nba --collection=finals output.json`.

Running Some Basic Queries
--------------------------

Let's take a look at some basic examples to get the hang of this data set.
The most basic query: when's the last year the Golden State Warriors won the
NBA Finals?

```
> db.finals.find({ winner: 'Golden State Warriors' }, { year: 1 });
{ "_id" : ObjectId("558c6b8b8262b87939324592"), "year" : "2015" }
{ "_id" : ObjectId("558c6b8b8262b879393245c1"), "year" : "1975" }
```

The answer is 1975. I feel vindicated because as recently as 2 years ago I
thought I'd never live to see the day the Warriors won the Finals.

As recently as 2 weeks ago, I thought I'd never live to see the day that
Andre Iguodala would win the Finals MVP. He must be
[really love golf](http://ftw.usatoday.com/2015/06/steve-kerr-andre-iguodala-steph-curry-augusta).
Turns out, if you order Finals MVPs by first name, he comes first.

```
> db.finals.find({ mvp: { $ne: '' } }, { year: 1, mvp: 1 }).sort({ mvp: 1 }).limit(3);
{ "_id" : ObjectId("558c6b8b8262b87939324592"), "year" : "2015", "mvp" : "A. Iguodala" }
{ "_id" : ObjectId("558c6b8b8262b879393245b8"), "year" : "1977", "mvp" : "B. Walton" }
{ "_id" : ObjectId("558c6b8b8262b8793932459c"), "year" : "2004", "mvp" : "C. Billups" }
```

The Warriors' Stephen Curry is from a prolific basketball family. His father
played in the NBA and his younger brother is in the NBA Development League.
While he is the first member of his family to win an NBA Championship, he's
not the first Curry:

```
> db.finals.find({ winnerRoster: /Curry/ }, { year: 1, team: 1, 'winnerRoster.$': 1 })
{ "_id" : ObjectId("558c6b8b8262b87939324592"), "year" : "2015", "winnerRoster" : [ "Stephen Curry" ] }
{ "_id" : ObjectId("558c6b8b8262b879393245a2"), "year" : "2012", "winnerRoster" : [ "Eddy Curry" ] }
```

Who's Lost the Most NBA Finals?
-------------------------------

I mentioned previously that LeBron James' 4 NBA finals loses puts him tied for
5th all-time. Who are the players that have lost the NBA Finals more? Much to
my shame as a lifelong Lakers fan, Lakers greats Elgin Baylor and Jerry West
each were part of 8 Finals-losing Lakers teams in the 50's, 60's, and 70's.

```
> db.finals.aggregate([{ $unwind: '$loserRoster' }, { $group: { _id: '$loserRoster', count: { $sum: 1 }, teams: { $push: { team: '$loser', year: '$year' } } } }, { $sort: { count: -1 } }, { $limit: 4 }]).pretty();
{
	"_id" : "Elgin Baylor",
	"count" : 8,
	"teams" : [
		{
			"team" : "Los Angeles Lakers",
			"year" : "1968"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1970"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1969"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1966"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1963"
		},
		{
			"team" : "Minneapolis Lakers",
			"year" : "1959"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1965"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1962"
		}
	]
}
{
	"_id" : "Jerry West",
	"count" : 8,
	"teams" : [
		{
			"team" : "Los Angeles Lakers",
			"year" : "1973"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1968"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1970"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1969"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1966"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1963"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1965"
		},
		{
			"team" : "Los Angeles Lakers",
			"year" : "1962"
		}
	]
}
{
	"_id" : "Larry Foust",
	"count" : 5,
	"teams" : [
		{
			"team" : "St. Louis Hawks",
			"year" : "1960"
		},
		{
			"team" : "Fort Wayne Pistons",
			"year" : "1955"
		},
		{
			"team" : "Minneapolis Lakers",
			"year" : "1959"
		},
		{
			"team" : "Fort Wayne Pistons",
			"year" : "1956"
		},
		{
			"team" : "St. Louis Hawks",
			"year" : "1961"
		}
	]
}
{
	"_id" : "Max Zaslofsky",
	"count" : 5,
	"teams" : [
		{
			"team" : "Fort Wayne Pistons",
			"year" : "1955"
		},
		{
			"team" : "New York Knicks",
			"year" : "1953"
		},
		{
			"team" : "Fort Wayne Pistons",
			"year" : "1956"
		},
		{
			"team" : "New York Knicks",
			"year" : "1952"
		},
		{
			"team" : "New York Knicks",
			"year" : "1951"
		}
	]
}
```

Let's take a closer look at the aggregation pipeline.

```javascript
[
	{ $unwind: '$loserRoster' },
	{
		$group: {
			_id: '$loserRoster',
			count: { $sum: 1 },
			teams: { $push: { team: '$loser', year: '$year' } }
		}
	},
	{ $sort: { count: -1 } },
	{ $limit: 4 }
]
```

There are 4 stages. The first stage, `$unwind`, breaks up the `loserRoster`
array that contains every player on the losing side. Now your pipeline has a
separate document for every player that has ever lost an NBA finals.

In order to combine that data to answer the question of who's lost the most,
you need a `$group` stage. This stage creates a document for every player,
counts the number of times they appear in the pipeline, and pushes the
team they were on onto a `teams` array. This gives you a nice neat document
that contains the number of times a player has lost the NBA Finals and the
losing teams they were a part of.

The rest is easy: sort by `count` in descending order and limit to 4, and now
you have the 4 players that have lost more than 4 NBA Finals. You gotta feel
bad for Max Zaslofsky - he played in 5 NBA Finals in 6 years with 2 different
teams and lost every single one. Not too dissimilar from LeBron James, who has
appeared in the NBA Finals each of the last 5 seasons and lost 3 times with
2 different teams. On the plus side, Zaslofsky was the youngest player to be
named to the All-NBA First Team until LeBron James in 2005-06.

However, Zaslofsky played in the 1950's - players with a last name ending in
'sky' are uncommon in the NBA these days. As a matter of fact, Zaslofsky is
the only player whose name ends in 'sky' to play for teams that made it to
the Finals. There were a few 'ski' last names, the latest being Jim Rowinski,
who played 6 games and scored 4 points for the 1989 'Bad Boys' Detroit Pistons.

```
> db.finals.aggregate([{ $project: { year: 1, players: { $setUnion: ['$winnerRoster', '$loserRoster'] } } }, { $unwind: '$players' }, { $group: { _id: '$players', years: { $push: '$year' } } }, { $match: { _id: /sk[iy]$/ig } }]);
{ "_id" : "Johnny Macknowski", "years" : [ "1950" ] }
{ "_id" : "Joe Graboski", "years" : [ "1956" ] }
{ "_id" : "Max Zaslofsky", "years" : [ "1955", "1953", "1956", "1952", "1951" ] }
{ "_id" : "Steve Kuberski", "years" : [ "1976", "1974" ] }
{ "_id" : "Jim Rowinski", "years" : [ "1989" ] }
{ "_id" : "Frank Brickowski", "years" : [ "1996", "1987" ] }
```

This is another interesting aggregation worth taking a closer look at.

```javascript
[
	{
		$project: {
			year: 1,
			players: { $setUnion: ['$winnerRoster', '$loserRoster'] }
		}
	},
	{ $unwind: '$players' },
	{ $group: { _id: '$players', years: { $push: '$year' } } },
	{ $match: { _id: /sk[iy]$/ig } }
]
```

The interesting part is the `$project` operator. This operator transforms
the documents by unifying the `winnerRoster` and `loserRoster` array so you
can properly `$unwind` all the players. The
[`$setUnion` operator](http://docs.mongodb.org/manual/reference/operator/aggregation/setUnion/#exp._S_setUnion)
is quite handy for this precise use case, where you want to merge 2 arrays
so you can `$unwind` over both of them.

Of course, the first aggregation of this section partially answered the question
of whether LeBron James is the only player to lose in the NBA Finals twice with
2 different teams. There are at least 2 others - Zaslofsky lost 3 times with
the Knicks and twice with the Fort Wayne Pistons. His Pistons teammate Larry
Foust ended up on the losing end of 2 more NBA Finals loses with the St Louis
Hawks, and another one with the Minneapolis Lakers to boot.

This begs 2 questions. First, are these the only 3? Second, how many other
players have been on the losing end of the NBA Finals for 3 different teams?
Turns out, just 4 others:

```
> db.finals.aggregate([{ $unwind: '$loserRoster' }, { $group: { _id: { player: '$loserRoster', team: '$loser' } } }, { $group: { _id: '$_id.player', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }]).pretty();
{ "_id" : "Eric Snow", "count" : 3 }
{ "_id" : "Danny Ainge", "count" : 3 }
{ "_id" : "Larry Foust", "count" : 3 }
{ "_id" : "Sam Perkins", "count" : 3 }
{ "_id" : "Kendrick Perkins", "count" : 3 }
{ "_id" : "Erick Dampier", "count" : 2 }
```

Back to the Original Question
-----------------------------

The original question of 'which players in NBA history have lost the NBA Finals
at least twice with at least two teams?' involves a trickier aggregation. It
involves two separate `$group` stages, but its quite doable. You'll need 5
aggregation stages:

1. `$unwind` the loser roster, so you get a separate document for every player
that's ever been on the losing side of the NBA Finals
1. Use `$group` to count the number of times a player has been on the losing
side of the NBA Finals with a particular team.
1. Use `$match` to rule out any player/team pairs where the player wasn't on
the team for at least 2 NBA Finals losses.
1. Use `$group` to count the number of teams a given player has at least 2
NBA Finals losses with.
1. Use `$match` to filter out players that don't have at least 2 teams that
they have at least 2 NBA Finals losses with.

```javascript
[
	{ $unwind: '$loserRoster' },
	{
		$group: {
			_id: {
				player: '$loserRoster',
				team: '$loser'
			},
			count: { $sum: 1 }
		}
	},
	{
		$match: { count: { $gte: 2 } }
	},
	{
		$group: {
			_id: '$_id.player',
			count: { $sum: 1 },
			teams: { $push: '$_id.team' }
		}
	},
	{ $match: { count: { $gte: 2 } } }
]
```

The result is what you might expect - its just LeBron James, Max Zaslofsky,
and Larry Foust, no others.

```
{ "_id" : "Max Zaslofsky", "count" : 2, "teams" : [ "New York Knicks", "Fort Wayne Pistons" ] }
{ "_id" : "LeBron James", "count" : 2, "teams" : [ "Cleveland Cavaliers", "Miami Heat" ] }
{ "_id" : "Larry Foust", "count" : 2, "teams" : [ "St. Louis Hawks", "Fort Wayne Pistons" ] }
```

Conclusion
----------

That's a lot of aggregations! Hopefully you've seen some of the interesting
and powerful things you can do with the MongoDB aggregation framework. In
particular, the ability to group, match, and then re-group gives you the
ability to answer some surprisingly sophisticated questions about your data.
And, more importantly, you can impress people at the bar by explaining that
LeBron James is one of only 3 players to be on the losing end of multiple NBA
Finals with 2 different franchises.

*Legal note: the attached data set is property of Sports Reference, LLC, and may only be used for education and evaluation under clause #1 of their [terms of use](http://www.sports-reference.com/termsofuse.shtml). If you have not read or do not agree to [Sports Reference, LLC's terms of use](http://www.sports-reference.com/termsofuse.shtml), please do not download the data set.*
