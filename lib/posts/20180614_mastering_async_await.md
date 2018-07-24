[Async/await](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js) is the most important new feature in JavaScript in recent memory. [Generators](http://thecodebarbarian.com/3-common-co-design-patterns) provided an alternative in ES6, but generators required [outside libraries](http://npmjs.com/package/co) and provided more flexibility than most developers needed. When I was a [guest on the JavaScript Air podcast](http://audio.javascriptair.com/e/044-jsair-async-patterns-in-javascript-with-valeri-karpov-and-peter-lyons/), the host [Kent C. Dodds](https://twitter.com/kentcdodds) asked me what generators could do that async/await couldn't, and my answer was essentially "nothing that the vast majority of developers would care about."

[Generators](http://es2015generators.com/) are more powerful and flexible than async/await, but
async/await cuts away the inconsequential details of generators and leaves you with the most valuable functionality: flat asynchronous code
with no callbacks, no promise chains, and no [closures](https://twitter.com/code_barbarian/status/1007019400170557446) of any kind. However, many developers out there are struggling with
async/await. If async/await doesn't click for you, you're not alone:
[StackOverflow](https://stackoverflow.com/questions/tagged/async-await)
has nearly 10k async/await questions, and 5 of the top 10 most
popular articles on this blog are about async/await and promises.

Introducing _Mastering Async/Await_
-----------------------------------

Right now, learning async/await is a hodge-podge of reading blog posts
with wildly different coding styles and cobbling together StackOverflow
answers. You can get to mastery in a few days if you're patient and
dedicated, but what if you can go from cursory knowledge to mastery
in a few hours? What if instead of guessing based on outdated
StackOverflow answers whether [Express](http://expressjs.com/) or [React](https://reactjs.org/) supported async/await, you had a mental
framework to figure it out for yourself? That's what my new ebook, <a href="http://asyncawait.net">_Mastering Async/Await_</a>, is all about.

<a href="http://asyncawait.net">
  <img src="http://asyncawait.net/images/cover_400.png" style="width: 200px">
</a>

Here's the <a href="http://asyncawait.net/bin/toc.pdf">full table of contents</a>. Like my last ebook, its meant to be focused and concise,
as opposed to your average 1000 page meandering tome of a tech book.
Below is a breakdown of the motivation of each of the 4 chapters.

1. **Async/Await: The Good Parts** Introduces async/await and how it works with JavaScript language structures like `for` loops and `if` statements.
2. **Promises from the Ground Up** Async/await is built on promises, but most developers have only a cursory understanding of promises. This chapter walks you through building a <a href="https://promisesaplus.com/">Promises/A+</a> compliant promise library from scratch.
3. **Async/Await Internals** Promises are the micro-level of async/await. This chapter builds up your macro-level understanding on top of promises by showing how async/await interacts with instrumented promises.
4. **Async/Await in the Wild** Most developers don't use async/await by itself, they use it with [Mocha](http://npmjs.com/package/mocha), [Express](https://www.npmjs.com/package/express), [MongoDB](https://www.npmjs.com/package/mongodb), [Redux](https://www.npmjs.com/package/redux), [React](https://www.npmjs.com/package/react), and countless other npm modules. Chapter 4 discusses how to integrate async/await with 5 common npm modules. In the spirit of [teaching you to fish](http://www.bartleby.com/73/484.html), this chapter also presents  rules of thumb for determining whether an npm module supports async/await out of the box.

Moving On
---------

_Mastering Async/Await_ contains the distilled lessons of 2 years of running async/await in production and 5 years of running [generator-based async/await equivalents](http://npmjs.com/package/co) in production. Since [Node.js v7.6.0 removed the need to specify a flag to use async/await](https://nodejs.org/en/blog/release/v7.6.0/), async/await has become an indispensable part of my day-to-day dev practice. Check out the [table of contents](http://asyncawait.net/bin/toc.pdf) and [sample section](http://asyncawait.net/bin/page-30-31.pdf), and get your copy
at [`asyncawait.net`](http://asyncawait.net/).
