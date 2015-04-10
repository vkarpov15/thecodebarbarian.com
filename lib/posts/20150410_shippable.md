I've [spent a fair amount of time lauding Travis](/2015/02/13/travis_coveralls) as an excellent go-to CI tool. But, when I wanted to use Travis
for a private repo, I balked at the minimum $129/mo price
tag. Add onto that [the cost of using Coveralls Pro](https://coveralls.io/pricing) and I realized that using
Travis and Coveralls for private repos is not financially
feasible. Even if I had millions in funding to burn, it would be
cheaper in the long run to bite the bullet and set up my
own hosted CI using [Strider](https://github.com/Strider-CD/strider)
or some other open-source CI server.

Thankfully, before I got around to setting up my own,
I stumbled across a company called
[Shippable](http://www.shippable.com/) when they
[commented on a mongoose GitHub issue](https://github.com/Automattic/mongoose/issues/2423). Shippable positions
itself as a
Docker-ized hosted CI. But, if you don't ignore the buzzword 
bingo, you'll miss four of its key advantages over Travis:

* [Free for private repos](http://www.shippable.com/pricing.html)
* [$12/year for using your own dedicated hardware](http://www.shippable.com/pricing.html)
* Actual test reports (Xunit) rather than just console output
* [Test coverage reporting built-in rather than through Coveralls](http://www.shippable.com/features.html)

Setting Up Shippable
====================

Shippable has a [NodeJS startup guide](http://docs.shippable.com/en/latest/start.html)
and [sample repo](https://github.com/shippableSamples/sample_node).
For the benefit of Travis users, I set up a
[simple fizzbuzz repo that's integrated with Shippable](https://github.com/vkarpov15/fizzbuzz-coverage-shippable) that's
analagous to my [fizzbuzz example for Travis](/2015/02/13/travis_coveralls).

A Shippable config file, `shippable.yml`, looks an awful lot like
a `.travis.yml` file. As a matter of fact, you can run Shippable
with your existing `.travis.yml` file (unless you use io.js) -
Shippable will look for a `.travis.yml` if it can't find a
`shippable.yml`. Here's the `shippable.yml` for the
`fizzbuzz-coverage-shippable` repo:

```
# language setting
language: node_js

node_js:
  - 0.10.33
  - 0.12.2

# Create directories for test and coverage reports
before_script:
  - npm install
  - mkdir -p shippable/testresults
  - mkdir -p shippable/codecoverage

script:
  - npm run-script test-shippable

after_script:
  - npm run-script test-coverage
  - npm run-script shippable-cobertura
```

There are two key differences from Travis above:

* It looks like you need to run `npm install` in your `before_script`. Maybe I'm doing something wrong, but Shippable didn't automatically do that for me.
* The `after_script` runs test coverage using the `test-coverage`
script and then converts the coverage output to
[cobertura format](https://github.com/gotwarlost/istanbul/issues/17),
which is the format Shippable prefers for code coverage output.

The `package.json` is identical to the
Travis-based `fizzbuzz-coverage` repo, except for the fact that
the `coveralls` module is no longer necessary for code coverage,
and the slightly modified scripts:

```
  "scripts": {
    "shippable-cobertura": "istanbul report cobertura --dir shippable/codecoverage/",
    "test": "mocha ./test/*",
    "test-shippable": "mkdir -p shippable/testresults && mocha --reporter xunit ./test/* > shippable/testresults/result.xml",
    "test-coverage": "istanbul cover ./node_modules/mocha/bin/_mocha -- -R spec ./test/*"
  }
```

* The `shippable-cobertura` script converts the output from
`test-coverage` into [cobertura format](https://github.com/gotwarlost/istanbul/issues/17) for Shippable's built-in
test coverage reporting.
* The `test-shippable` script runs tests and outputs the results
using mocha's
[xunit reporter](https://github.com/mochajs/mocha/issues/10),
because Shippable provides better test reporting (rather than simply console output) if you provide it Xunit-compatible output.
* The `test-coverage` script is just your standard code coverage
script with istanbul.

Conclusion
==========

Shippable looks pretty awesome. I look forward to trying it out
on my private repos - it has all the features I love in Travis
([pull request support](https://github.com/vkarpov15/fizzbuzz-coverage-shippable/pull/1), etc.),
a couple extra useful features, and free as in beer. My
experience so far is overall positive, although it does look
like it takes its time running tests on pull requests. If you're
looking for a hosted CI tool for private repos, Shippable seems
like a good choice.