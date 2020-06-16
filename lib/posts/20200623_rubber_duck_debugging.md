[Rubber duck debugging](https://en.wikipedia.org/wiki/Rubber_duck_debugging) is a neat trick you can use
to get yourself unstuck when you're debugging. It is especially helpful for people who are just
learning to code, who often get stuck because they aren't able to break the problem down
into smaller pieces.

The idea behind rubber duck debugging is to try to explain the issue you're
debugging to a rubber duck. It doesn't necessarily have to be a rubber duck -
you can pick any object, you can talk to yourself, or you can talk to a
colleague. I sometimes find myself explaining problems to a
toy penguin that I keep on my desk.

<img src="/images/penguin.jpg" class="inline-image" style="width: 30%">

Coming up with the solution in the middle of explaining a problem is
a surprisingly common occurrence. It's hard to get through an episode
of [Suits](https://www.imdb.com/title/tt1632701/) or [Billions](https://www.sho.com/billions)
without at least one character having a revelation mid-sentence.
Rubber duck debugging won't turn you into the Harvey Specter of computer
programming by itself, but it can be very helpful if you're stuck.

The Problem is the Solution
-------------------------

The siren song of bad debugging is the urge to come up with a solution
without actually defining the problem. For example, I often work with
students at a [local code school](https://wyncode.co/) that are
just learning to code. Helping them debug an issue normally goes
something like this:

* Student: "I have a problem with Mongoose. This HTTP response in Postman isn't returning a result."
* Me: "OK. Is it responding with an error?"
* Student: "No, I'm just getting an empty response in Postman. Could it be that Mongoose is transforming the query into something weird?"
* Me: "That's possible. Let's turn on Mongoose debug mode, and see what query Mongoose is executing."
* Student: "Hmm, it looks like it isn't actually executing the query. What's wrong?"
* Me: "The code isn't even getting to the Mongoose query, so the problem is probably either an incorrect request or an error in your Express code. Let's throw in a print statement to log the HTTP request coming in."
* Student: "That's strange, the request came in, but it didn't get to the query code. Why?"
* Me: "Take a look at the headers, looks like there's no authorization header. Let's take a look at your Postman request."

More often than not, the students are stuck because they're trying to find a solution (how do I get Mongoose to return the correct query result?) without applying ["five whys"](https://en.wikipedia.org/wiki/Five_whys) to the problem or even defining the exact problem they're seeing.

When debugging, it is easy to get stuck when you're fixated on an incorrect
solution. That's where the rubber duck comes in. By taking a step back
and _explaining the problem_ rather than trying to implement your proposed
solution, you may find new potential solutions or flaws with your solution.

Even better, by trying to explain the problem, you're forced to both
define the exact issue (HTTP request returns an empty result), and
dive into why the issue is happening. This is an especially important
skill in full-stack web development, because there's so many layers
that you have to think about: client, server, database, etc. Unless
you narrow down the problem to one layer, you're unlikely to solve
the problem.

Debugging a full-stack web application often comes down to
asking "why?" over and over again, until you narrow down the problem
to its smallest possible form.

Moving On
---------

Rubber duck debugging is a neat trick that helps you concretely define
the problem you're trying to solve, and ask "why?" to widdle the problem
down into something manageable. It's easy to get stuck when debugging
a full-stack web application because there's so many different pieces
to check. Asking "why?" helps you eliminate possibilities and simplify
seemingly intractable issues.