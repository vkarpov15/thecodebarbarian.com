There's a lot of solutions out there for putting private projects in your
`package.json`: [sinopia](https://www.npmjs.com/package/sinopia),
[gemfury](https://gemfury.com/help/npm-registry), and
[npm's own solution](https://www.npmjs.com/npm/private-packages). All of
these come with their own problems: sinopia is self-hosted, and gemfury and
npm cost money. All 3 require you to learn a separate tool just to be able
to download and install dependencies.

Why Not Just Use GitHub?
------------------------

There's a tragically underutilized npm feature that can make GitHub into
your own personal private registry. Here's how you might list mongoose
version 4.2.4 in your package.json:

```javascript
{
  "dependencies": {
    "mongoose": "4.2.4"
  }
}
```

You can also do this:

```javascript
{
  "dependencies": {
    "mongoose": "git@github.com:Automattic/mongoose.git#4.2.4"
  }
}
```

You get slightly different output from `npm list` (show below), but you can then
`require('mongoose')` like you would normally. Upgrading is also easy:
just change `4.2.4` to `4.2.7` and run `npm install` normally. Also, you're
not limited to just version numbers. You can list any git tag, git hash, or
even branch after the `#` above.

```
└─┬ mongoose@4.2.4  (git+ssh://git@github.com/Automattic/mongoose.git#6eac35f8e6ac591c9de327f496a35ca42a596c6f)
  ├── async@0.9.0
  ├── bson@0.4.22
  ├── hooks-fixed@1.1.0
  ├── kareem@1.0.1
  ├─┬ mongodb@2.0.46
  │ ├── es6-promise@2.1.1
  │ ├─┬ mongodb-core@1.2.19
  │ │ └─┬ kerberos@0.0.19
  │ │   └── nan@2.0.9
  │ └── readable-stream@1.0.31
  ├── mpath@0.1.1
  ├── mpromise@0.5.4
  ├─┬ mquery@1.6.3
  │ └── bluebird@2.9.26
  ├── muri@1.0.0
  ├── regexp-clone@0.0.1
  └── sliced@0.0.5
```

To install from the command line, use the below command.

```
npm install git+ssh://git@github.com/Automattic/mongoose.git#4.2.4
```

This also works with private repos. As long as you can clone a repo, you can
put it in your `package.json` dependencies. The big advantage is that, instead
of having 2 tools to manage access to your internal GitHub repos (GitHub and
your private npm registry), you have only 1.

The disadvantage is that this approach requires you to have git installed.
Most Node.js engineers I know use git, but, after 2 years of suffering through
working with Golang and its bazaar (pun intended) menagerie of version control
systems, I'm wary of making `npm install` depend on git. However, the benefits
of being able to reuse GitHub's security settings and not having to pay an
extra monthly fee outweigh the surprise dependency. Especially since I have
no intention of using any version control system other than git in the
forseeable future.

Conclusion
----------

If you already use GitHub for your private repos, it's easy to include them
as dependencies in your `package.json`. Before you reach for a private
registry, think carefully about whether your existing tools already solve
your problem.
