I find the existence of tools like [nvm](https://github.com/creationix/nvm/blob/master/README.markdown) baffling. I could understand if setting up Node.js required an actual installer or compiler or python, but [node has pre-built binaries for most operating systems](http://nodejs.org/download). Node and npm are both portable standalone executables, so all you need is the right binary for your OS in the right place on your file system. Especially if you're switching back and forth between Node 6.x and 7.6.0 for [async/await](http://thecodebarbarian.com/80-20-guide-to-async-await-in-node.js.html), you should simplify your node version management workflow rather than using yet another bloated tool.

Using Symlinks
--------------

[Symlinks](https://en.wikipedia.org/wiki/Symbolic_link) are a handy tool in most unix-like operating systems, like Linux or OSX. The `ln` command lets you create a new symlink:

```
# Now `./baz` is a symlink to /foo/bar
# If `/foo/bar` is an executable, you can run it with `./baz`
ln -s /foo/bar baz
```

To download and "install" node v7.6.0 and the corresponding npm version 4.1.2, first you need to download and untar it:

```
wget https://nodejs.org/download/release/v7.6.0/node-v7.6.0-linux-x64.tar.gz
tar -zxvf node-v7.6.0-linux-x64.tar.gz
```

And then you need to symlink `node` and `npm` into a folder that's on your PATH. I like `/usr/bin` for Linux. I used `/usr/local/bin` for OSX but I haven't used OSX regularly in many years, so OSX is [left as an exercise to the reader](http://uncyclopedia.wikia.com/wiki/Proof#Proof_by_Delegation).

```
ln -s `pwd`/node-v7.6.0-linux-x64/bin/node /usr/bin/node
ln -s `pwd`/node-v7.6.0-linux-x64/bin/npm /usr/bin/npm
```

Want to switch back to node v6.9.1?

```
rm /usr/bin/node
rm /usr/bin/npm
ln -s `pwd`/node-v6.9.1-linux-x64/bin/node /usr/bin/node
ln -s `pwd`/node-v6.9.1-linux-x64/bin/npm /usr/bin/npm
```

What Happens With The -g Flag?
------------------------------

It's no secret that I [think `npm install -g` is a blight on society](http://thecodebarbarian.com/2015/02/27/npm-install--g). One great feature of this version management paradigm is that `npm install -g` no longer works by default.

```
$ npm install gulp -g
/home/val/Workspace/node-v7.6.0-linux-x64/bin/gulp -> /home/val/Workspace/node-v7.6.0-linux-x64/lib/node_modules/gulp/bin/gulp.js
/home/val/Workspace/node-v7.6.0-linux-x64/lib
$ gulp
gulp: command not found
$
```

If you need `npm install -g` for some reason, don't worry, you can make it work. Everything you `npm install -g` ends up in the `node-v7.6.0-linux-x64/bin/` directory, so you can either add that directory to your PATH, or symlink the individual executables.

```
$ ln -s `pwd`/node-v7.6.0-linux-x64/bin/gulp /usr/bin/gulp
$ gulp -v
[17:03:53] CLI version 3.9.1
$
```

Note also that your executables are all stored underneath the `node-v7.6.0-linux-x64` directory. This means that removing old versions of node is as simple as deleting the whole directory. This will even clean up modules installed with `-g`.

Conclusion
----------

This is the paradigm I've used to manage node versions since early 2015. I'm sure this approach has limitations, but I've found it to be the simplest and cleanest approach to node version management. Unless you find yourself forgetting the order of parameters to `ln -s`, you don't need any docs or APIs or README's, just solid Linux/OSX fundamentals. Give it a shot next time you need to install a new version of node!

*I believe in doing things the easy way, and probably the easiest way to make yourself a better engineer is to get better sleep. Unfortunately, LEDs, screens, streetlights, and car headlights weren't designed with your sleep quality in mind. I've used [these blue-light-blocking glasses](https://www.amazon.com/gp/product/B000USRG90/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=B000USRG90&linkCode=as2&tag=codebarbarian-20&linkId=f4937c5f736d3c567902dcaa59afa0f7) ([non-affiliate link](https://www.amazon.com/Uvex-Blocking-Computer-Glasses-SCT-Orange/dp/B000USRG90/)) for late night coding since 2014. They help me wind down at night even if I'm still staring at a [flux-less](https://justgetflux.com/) screen at midnight.*
