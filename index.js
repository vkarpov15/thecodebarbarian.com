const _ = require('underscore');
const acquit = require('acquit');
const fs = require('fs');
const markdown = require('marked');
const jade = require('jade');
const file = require('file');
const feed = require('feed');
const transform = require('acquit-require');

require('acquit-ignore')();

const highlight = require('highlight.js');
markdown.setOptions({
  highlight: function(code) {
    return highlight.highlight('JavaScript', code).value;
  }
});

const wagner = require('wagner-core');

const posts = require('./lib/posts');
const postsConfig = _.sortBy(posts, function(post) { return -post.date.unix(); });

const templates = {
  index: null,
  post: null,
  list: null
};
const postsContent = {};
const postBySource = {};

const loadTemplate = function(path, key) {
  return asyncFunctionToThunk(async function() {
    const view = await new Promise((resolve, reject) => {
      fs.readFile(path, (err, res) => {
        if (err != null) {
          return reject(err);
        }
        resolve(res);
      })
    });
    const result = jade.compile(view, { filename: path });
    return result;
  });
};

wagner.task('index', loadTemplate('./lib/views/index.jade', 'index'));
wagner.task('postTemplate', loadTemplate('./lib/views/post.jade', 'post'));
wagner.task('listTemplate', loadTemplate('./lib/views/list.jade', 'list'));

async function getPosts() {
  const tests = [
    ...acquit.parse(fs.readFileSync('./test/20180621.test.js').toString()),
    ...acquit.parse(fs.readFileSync('./test/20180702.test.js').toString()),
    ...acquit.parse(fs.readFileSync('./test/20180710.test.js').toString())
  ];

  await Promise.all(posts.map(async (post) => {
    const md = await new Promise((resolve, reject) => {
      fs.readFile(post.src, (err, res) => {
        if (err != null) {
          return reject(err);
        }
        resolve(res);
      });
    });

    post.md = md.toString();
    post.md = transform(post.md, tests);
  }));

  return posts;
}

function asyncFunctionToThunk(fn) {
  return function(callback) {
    fn().then(res => callback(null, res), err => callback(err));
  };
}

var tasks = ['loadIndex'];
var tags = {};
_.each(posts, function(post) {
  _.each(post.tags || [], function(tag) {
    tags[tag] = tags[tag] || [];
    tags[tag].unshift(post);
  });
});

wagner.task('compiledPosts', asyncFunctionToThunk(getCompiledPosts));

async function getCompiledPosts() {
  const posts = await getPosts();

  const filename = './lib/views/post.jade';
  const postTemplate = jade.compile(fs.readFileSync(filename, 'utf8'), { filename });

  for (const post of posts) {
    const output = postTemplate({
      post: post,
      content: markdown(post.md.toString()),
      allPosts: postsConfig
    });

    post.compiled = output;
    post.preview = markdown(post.md.substr(0, post.md.indexOf('\n')));
  }

  return posts;
}

wagner.task('generatePosts', asyncFunctionToThunk(async function() {
  console.log('Generating posts');
  const compiledPosts = await getCompiledPosts();

  for (const post of compiledPosts) {
    console.log('Writing "' + post.title + '"');
    const path = file.path.join(post.dest.directory, post.dest.name + '.html');
    fs.writeFileSync(path, post.compiled);
  }
}));

wagner.task('tags', asyncFunctionToThunk(async function() {
  const filename = './lib/views/list.jade';
  const listTemplate = jade.compile(fs.readFileSync(filename, 'utf8'), { filename });

  for (const key of Object.keys(tags)) {
    const output = listTemplate({
      tag: key,
      posts: [].concat(tags[key]).reverse(),
      allPosts: postsConfig,
      pageNum: 0,
      isLastPage: false
    });

    fs.writeFileSync('./bin/tag/' + key.toLowerCase() + '.html', output);
  }
}));

wagner.task('compiledIndex', asyncFunctionToThunk(async function() {
  const filename = './lib/views/index.jade';
  const index = jade.compile(fs.readFileSync(filename, 'utf8'), { filename });

  const compiledPosts = await getCompiledPosts();

  const posts = [].concat(compiledPosts).reverse();
  const output = index({
    posts,
    allPosts: postsConfig
  });

  fs.writeFileSync('./bin/index.html', output);
  fs.writeFileSync('./bin/CNAME', 'thecodebarbarian.com');
}));

wagner.task('recommendations', asyncFunctionToThunk(async function() {
  const filename = './lib/views/recommendations.jade';
  const recommendations = jade.compile(fs.readFileSync(filename, 'utf8'), { filename });

  fs.writeFileSync('./bin/recommendations.html', recommendations());
}));

wagner.task('pages', asyncFunctionToThunk(async function() {
  const compiledPosts = await getCompiledPosts();
  const filename = './lib/views/list.jade';
  const listTemplate = jade.compile(fs.readFileSync(filename, 'utf8'), { filename });

  var pages = [];
  var reversed = [].concat(compiledPosts).reverse();
  for (var i = 8; i < posts.length; i += 8) {
    pages.push(listTemplate({
      tag: 'Page ' + Math.floor(i / 8),
      posts: reversed.slice(i, i + 8),
      allPosts: postsConfig,
      pageNum: Math.floor(i / 8),
      isLastPage: !(i + 8 < posts.length)
    }));
  }

  for (const [i, page] of Object.entries(pages)) {
    fs.writeFileSync('./bin/page/' + (+i + 1) + '.html', page);
  }
}));

wagner.task('feed', asyncFunctionToThunk(async function() {
  const compiledPosts = await getCompiledPosts();
  const posts = Array.from(compiledPosts);

  const f = new feed({
    title: 'TheCodeBarbarian.com',
    description: 'Detailed articles about the MEAN stack and related topics',
    link: 'http://thecodebarbarian.com',
    image: 'http://thecodebarbarian.com/images/Barbarian_Head.png',
    author: {
      name: 'Valeri Karpov'
    }
  });

  const reversed = posts.reverse();
  for (let i = 0; i < reversed.length; ++i) {
    f.addItem({
      title: posts[i].title,
      link: 'http://www.thecodebarbarian.com' + posts[i].dest.directory.substr('./bin'.length) + '/' + posts[i].dest.name + '.html',
      date: posts[i].date.toDate()
    });
  }

  fs.writeFileSync('./bin/feed.xml', f.render('rss-2.0').replace(new RegExp('<content:encoded/>', 'g'), ''));
}));

wagner.invokeAsync(function(error, compiledIndex, pages, generatePosts, tags, feed, recommendations) {
  if (error) {
    return console.log('Errors occurred: ' + error + '\n' + error.stack);
  }
  console.log('Done');
});

module.exports = function(cb) {
  wagner.invokeAsync(function(error, compiledIndex, generatePosts, tags, feed, recommendations) {
    if (error) {
      cb(error);
      return console.log('Errors occurred: ' + error + '\n' + error.stack);
    }
    cb();
    console.log('Done');
  });
};
