[Keeping a changelog](https://keepachangelog.com/en/1.0.0/) is an important practice that many developers don't value enough. Keeping a changelog makes it easy for humans to understand what the important changes in a new release are. Even if you squash commits, there's a key difference between git commit messages and changelogs: commit messages are for developers actively working on the project, changelogs are for consumers of the software. Plus, changelogs are more portable because they are typically written in markdown, so you can search a changelog using a text editor and ctrl+f.

For example, if you're building a REST API, a mobile app developer may be a consumer of your software. The mobile app developer shouldn't care about minor internal refactors, but they care about whether that one bug was fixed or whether support for a new feature was released. That's why, at [Booster](https://trybooster.com/careers), we not only keep a changelog for all of our backend services, we have a slack channel that publishes the changelog of new versions as they come in.

<img src="https://i.imgur.com/myaDDCF.png">

Unfortunately, my best (highly unscientific) estimate is that only 5-10% of modules on [npm](https://www.npmjs.com/) keep a changelog in their GitHub repo. Here's a few examples:

* [lodash](https://github.com/lodash/lodash/wiki/Changelog)
* [mongoose](https://github.com/Automattic/mongoose/blob/master/History.md)
* [jquery.terminal](https://github.com/jcubic/jquery.terminal/blob/master/CHANGELOG.md)

So how do you keep an automated changelog in Node.js? In this article, I'll describe one basic way that doesn't involve manually typing out release notes in a markdown file.

Angular-Style Structured Commits
--------------------------------

The [Angular team's commit message convention](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines) is one of the more well adopted structured commit conventions.
Below is an example of some commits to the [Angular GitHub repo](https://github.com/angular/angular).

<img src="https://i.imgur.com/Y4SUAxt.png">

According to the [Angular commit message convention](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#-commit-message-guidelines), every commit message must start with a 'type' that describes the nature of the change at a high level. The 'type' lets you easily understand the intent of a commit: whether it fixes a bug, adds a new feature, changes the build system, etc. Below is a list of all currently supported types:

* build: Changes that affect the build system or external dependencies
* ci: Changes to our CI configuration files and scripts
* docs: Documentation only changes
* feat: A new feature
* fix: A bug fix
* perf: A code change that improves performance
* refactor: A code change that neither fixes a bug nor adds a feature
* style: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
* test: Adding missing tests or correcting existing tests

I've been using this commit message format for years across all my projects because it provides an easy way to separate changes that are consumer-facing versus internal. Generally, any commit that starts with `fix` or `feat` belongs in the changelog because consumers should be informed of bug fixes and features. Commits that start with `ci`, `chore`, `style`, or `build` do not belong in the changelog. Commits that start with `perf` or `docs` may belong in the changelog depending on your project.

Generating a Changelog from Angular Structured Commits
------------------------------------------------------

The source code for this example is available in the [`vkarpov15/changelog-example` GitHub repo](https://github.com/vkarpov15/changelog-example). The npm module I usually use for generating a changelog from Angular-style commit messages is called [standard-changelog](https://www.npmjs.com/package/standard-changelog). Standard-changelog is a command-line executable that processes every git commit between the previous tag and the current tag, and appends any `feat`, `fix`, or `perf` commits to the `CHANGELOG.md` file. For example, there are 4 commit messages in the [changelog-example repo](https://github.com/vkarpov15/changelog-example/commits/master):

* chore: release 0.2.0
* fix(index): remove unnecessary exclamation
* chore: use double quote instead of single for release script
* Initial commit

Standard-changelog ignores any commit whose message starts with `chore`. It also
ignores any commit message that doesn't have a type, so it ignores the commit with
the 'Initial commit' message. So when you run `./node_modules/.bin/standard-changelog`, you get the [below changelog](https://github.com/vkarpov15/changelog-example/commit/cf39305263610727f70f6c46f77bfa3d0b67d612):

```
<a name="0.2.0"></a>
# 0.2.0 (2018-09-18)


### Bug Fixes

* **index:** remove unnecessary exclamation ([d148e12](https://github.com/vkarpov15/changelog-example/commit/d148e12))
```

Generally, you should run `standard-changelog` from a release script in your `package.json`. This release script should encapsulate everything you need to do to create a new release for your project:

* Create a `chore: release X.Y.Z` commit
* Create a git tag for the release
* Append to `CHANGELOG.md`
* Push to `master`
* `npm publish` if necessary

For the changelog-example project, I added a `release` script that does all these tasks from the command line:

```
{
  "name": "changelog-example",
  "version": "0.2.0",
  "devDependencies": {
    "print-pkg-version": "0.2.1",
    "standard-changelog": "2.0.1"
  },
  "scripts": {
    "release": "standard-changelog && git commit -a -m \"chore: release `./node_modules/.bin/print-pkg-version`\" && git tag `./node_modules/.bin/print-pkg-version` && git push origin master --tags"
  }
}
```

With this release script, you still need to bump the `package.json` version manually.

Moving On
---------

Changelogs are how you tell your users what changes they need to be aware of. Commit logs are usually not enough, because they can include internal changes that are irrelevant to consumers and because they aren't sufficiently portable. So whether you're an npm module author, building an internal RESTful API, or building a mobile app, make sure you [keep a changelog](https://keepachangelog.com/en/1.0.0/) so your users know exactly what changes they should be aware of.

*Worried about what's going on in your `./node_modules`? Still having left_pad nightmares? [Tidelift](https://tidelift.com/subscription/pkg/npm-mongoose?utm_source=npm-mongoose&utm_medium=website) is working to help maintainers communicate important changes to developers using their npm modules, like license changes and security fixes. If you like the idea of a centralized channel for npm module related information that's separate from GitHub, check out [Tidelift](https://tidelift.com/subscription/pkg/npm-mongoose?utm_source=npm-mongoose&utm_medium=website).*
