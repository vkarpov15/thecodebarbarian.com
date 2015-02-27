Every so often I run into an [npm module that uses `preferGlobal: true`](https://www.npmjs.com/package/marked)
or asks me to `npm install gulp -g` to run tests.
My training as a developer has made it so the term 'global' makes me gag. 
The `-g` flag is antithetical to what got me excited about node in the 
first place, which is why I don't even [install modules like StrongLoop](http://thecodebarbarian.com/2015/01/17/angularjs-loopback)
with `-g`. Here's why.

One-Step Installs
=================

The number one reason why I got into node in the first place
was that setting up a dev environment was easy enough that a
designer or product manager could do it.
In other web server setups I've worked with, like Rails or Apache, getting 
a designer set up to run the server locally was a sisyphean ordeal.
I'm sure using numerous global modules was a reasonable idea when only
full-fledged engineers touched code and engineers worked on one codebase 
on one machine, but that time is long past.

Seeing how Node worked was a dream come true. All I had to do
was set up Node, clone a git repo, and run `npm install`.
No need to install Java, finagle your `PATH`, or copy a config file into some
obscure OS-dependent `/var/blah` directory. All of a sudden, I had
a huge weight off my shoulders when the product guys could
modify the home page copy without going through me.

The `-g` flag breaks this idyllic setup. Saying "run `npm install gulp -g` after `npm install`" doesn't seem like much,
but it sneaks in a great deal of operational complexity.
The first question is, "what version of gulp?" Suppose tomorrow
gulp releases a new version that breaks your code. Now everybody
who installs gulp will be unable to run tests. That's ok, you
can fix it. But then you have to get everyone to upgrade gulp - time to
send out an email that everybody's going to ignore
anyway. Or you could tell everyone to run `npm install` and
`npm upgrade -g` every time they pull, which will ensure that
nobody on your team can use gulp until you push a fix. And
what if somebody needs to check out an old commit that will
only work with an older version of gulp?

<img src="//i.imgur.com/PfWLSfz.png" />

If only you had a way to map which commit depended on which
version of gulp... Oh wait, that's called `package.json`. Is it worth it to type `gulp` instead of `./node_modules/gulp/bin/gulp.js`, especially when you can just
create a shortcut in your `package.json` `scripts` section or in a `Makefile`?
I love some good syntactic sugar as much as the next developer,
but I don't think its worth the hassle.

When `-g` is Useful
====================

I'd argue the only case where `-g` is useful would be modules
like [n](https://www.npmjs.com/package/n), [nvm](https://www.npmjs.com/package/nvm), and [npm](https://www.npmjs.com/package/npm).
When your primary purpose is to manage the bare minimum global
dependencies necessary to run `npm install` rather than interact
directly with application code, I can see the merit.

Why am I ok with `node` and `npm` as dependencies that you need
to install globally? Because, at bare minimum, you need to be able
to parse the `package.json` file and install other dependencies.
To automatically install the other dependencies, you need some software,
so you might as well install globally. Since npm is an evolving codebase,
[relying on globally installed npm versions has its difficulties](https://github.com/promises-aplus/promises-tests/pull/69),
but thankfully [npm has a mechanism for dealing with that](https://docs.npmjs.com/files/package.json#enginestrict).

Conclusion
==========

My mentor in undergrad, [Brian Kernighan](http://en.wikiquote.org/wiki/Brian_Kernighan), once wrote that
"everyone knows that debugging is twice as hard as writing a program in the first place. So if you're as clever as you can be when you write it, how will you ever debug it?" I'd argue
that getting a non-technical product or marketing person to be comfortable
making small text changes without blowing up your code is twice as hard
as debugging it. If you value getting the less technical members of your
team involved, I'd recommend not going overboard on syntactic sugar and
make it as brain-dead simple as possible to get started with your software.

