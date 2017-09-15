The [node-static](https://www.npmjs.com/package/node-static) lib, a popular package for serving up files from an HTTP server, was broken from approximately [5:03pm PDT on September 12](https://github.com/broofa/node-mime/commit/404b573239557eb266501eb70106efa04217a96f) to approximately [1:19pm PDT on September 14](https://github.com/cloudhead/node-static/commit/2f790f01b70e3ff7d0d10fbacc1f911bacab20d7), despite the fact that there hadn't been a new release of node-static in 11 months. This breakage did not affect all installations of node-static. For example, if `node-static` was in your `package-lock.json` and you were on npm 5, you were not affected. However, we had code that was running `npm install node-static` in a `Dockerfile` and started suddenly getting the following error when running our docker container:

```
/usr/src/app/node_modules/node-static/lib/node-static.js:348
                      mime.lookup(files[0]) ||
                           ^

TypeError: mime.lookup is not a function
    at Server.respond (/usr/src/app/node_modules/node-static/lib/node-static.js:348:28)
    at /usr/src/app/node_modules/node-static/lib/node-static.js:64:22
    at FSReqWrap.oncomplete (fs.js:123:15)
```

What is even more disturbing is that this breakage was intended behavior for node-static, and the package maintainer has [not taken the necessary steps to ensure this issue does not happen again](https://github.com/cloudhead/node-static/blob/2f790f01b70e3ff7d0d10fbacc1f911bacab20d7/package.json#L29-L30).

Where Semver Goes Wrong
-----------------------

Some npm alternatives like Yarn have [criticized npm < 5 for not supporting reproducible builds](https://spin.atomicobject.com/2016/12/16/reproducible-builds-npm-yarn/) except via [shrinkwrap](https://docs.npmjs.com/cli/shrinkwrap). Our issue was a classic case of a non-reproducible build. Not only did we `npm install` a package manually in a `Dockerfile` (which is bad), but the package we installed was a ticking time bomb just waiting to go off.

We were installing `node-static` v0.7.9, which [listed `mime >=1.2.9` as a dependency](https://github.com/cloudhead/node-static/blob/ab26244449c8bc5246327207f3f540a24cdc1705/package.json#L31). The `node-static` package used `mime` internally for checking [MIME types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types). Unfortunately, a backwards-breaking v2.0.0 release of `mime` [was released on September 12](https://github.com/broofa/node-mime#version-2-notes) which broke an API that node-static relied on. Because of how [npm handles semver ranges](https://github.com/broofa/node-mime#version-2-notes), version `2.0.0` satisfies the `>=1.2.9` constraint. The `>=1.2.9` constraint means **all** releases after 1.2.9 are valid. Even if `mime` gets a backwards-breaking 3.0.0 release that changes the lib into a search engine for [Mr. Mime](https://bulbapedia.bulbagarden.net/wiki/Mr._Mime_(Pok%C3%A9mon)) gifs, it would still satisfy `>=1.2.9`.

```
$
$ node
> const semver = require('semver')
undefined
> semver.satisfies('2.0.0', '>=1.2.9')
true
>
(To exit, press ^C again or type .exit)
>
$
```

So in the end, our docker container suddenly started installing mime 2.0.0, and the resulting container crashed immediately every time we tried to run it:

<img src="https://i.imgur.com/xAKA5jA.png">

The quick fix was to peg the version of `mime` to `1.4.0`:

<img src="https://i.imgur.com/m648tiU.png">

The long term fix is to switch over to [serve-static](https://www.npmjs.com/package/serve-static) and never `npm install` without a `package-lock.json`. Pegging exact dependency versions is not enough to ensure a robust build if your upstream dependencies don't peg their dependency versions in a sane way. The [node-static lib still uses `>=` for its other production dependencies](https://github.com/cloudhead/node-static/blob/2f790f01b70e3ff7d0d10fbacc1f911bacab20d7/package.json#L29-L30), which means if somebody ships a backwards breaking version of [optimist](https://www.npmjs.com/package/optimist) node-static might very well break by design again.

Semver Conveys Intent, Not Guarantee
------------------------------------

One common mistake I've seen in the Node.js community is assuming that semver means you get a never-ending stream of bug fixes making your life easier from the upstream maintainers. This utopian view of semver leads to people generously using `~`, `>=`, and even `*` (install any version of this dependency) in their customer-facing app's `package.json`. However, if you're not using npm 5 and `package-lock.json` judiciously, this can lead to your app breaking overnight without you having done anything.

Remember that there are people that wrote the npm modules you depend on, and, like you, these people are fallible. I must confess to having accidentally released backwards-breaking patch releases to [mongoose](https://www.npmjs.com/package/mongoose) a couple times in my early years working on the project. Minor releases are even more confusing. If you use a plugin that adds a function called `foo()` to mongoose and I release a new minor version that has a different `foo()` function and breaks the plugin, is that backwards breaking? How can I test for that?

I like to say that semver communicates author intent, not a strict guarantee that any code that works on 4.3.3 will work on 4.3.4. If you had a workaround for a bug in 4.3.3 and that bug was fixed in 4.3.4, your workaround may break. And, unless the package pegs exact dependencies, you're also at the mercy of potential upstream issues from packages you might not even know exist. I had not heard of the mime package before yesterday. Obviously, if a patch or minor release breaks behavior you're relying on, you should report an issue and the maintainer should work with you to resolve it, but there are times when one person's feature is another person's bug.

Conclusion
----------

I am now much more bullish on npm 5 and `package-lock.json` because of the `>=` debacle. The more I can lock down my `package.json` dependencies and only upgrade via explicitly running `git commit`, the better. I would recommend you look at your upstream `package.json` deps and look for other "broken by design" libs that you might be depending on.

*Recently I've been reading numerous books on sales. Sales gets a bad rap among engineers. However, that is to our detriment, because as an engineer you need to convince people to adopt your product, even if your product is internally-facing. [The Challenger Sale](https://www.amazon.com/gp/product/1591844355/ref=as_li_qf_sp_asin_il_tl?ie=UTF8&tag=codebarbarian-20&camp=1789&creative=9325&linkCode=as2&creativeASIN=1591844355&linkId=9fa1d4cd2810ce79bd6392e3bbb1d2ab) was by far the most useful one I've read thus far, I highly recommend reading it, especially if you've always thought of sales as distasteful.*
