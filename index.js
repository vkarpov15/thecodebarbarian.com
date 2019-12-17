'use strict';

const acquit = require('acquit');
const fs = require('fs');
const markdown = require('marked');
const file = require('file');
const feed = require('feed');
const pug = require('pug');
const transform = require('acquit-require');

require('acquit-ignore')();

const highlight = require('highlight.js');
markdown.setOptions({
  highlight: function(code) {
    return highlight.highlight('JavaScript', code).value;
  }
});

const posts = require('./lib/posts');
const postsConfig = [].concat(posts).reverse();

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

var tags = {};
posts.forEach(function(post) {
  (post.tags || []).forEach(function(tag) {
    tags[tag] = tags[tag] || [];
    tags[tag].unshift(post);
  });
});

async function getCompiledPosts() {
  const posts = await getPosts();

  const filename = './lib/views/post.pug';
  const postTemplate = pug.compile(fs.readFileSync(filename, 'utf8'), { filename });

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

async function generatePosts() {
  console.log('Generating posts');
  const compiledPosts = await getCompiledPosts();

  for (const post of compiledPosts) {
    console.log('Writing "' + post.title + '"');
    const path = file.path.join(post.dest.directory, post.dest.name + '.html');
    fs.writeFileSync(path, post.compiled);
  }
}

async function generateTags() {
  const filename = './lib/views/list.pug';
  const listTemplate = pug.compile(fs.readFileSync(filename, 'utf8'), { filename });

  for (const key of Object.keys(tags)) {
    const output = listTemplate({
      tag: key,
      posts: [].concat(tags[key]),
      allPosts: postsConfig,
      pageNum: 0,
      isLastPage: false
    });

    fs.writeFileSync('./bin/tag/' + key.toLowerCase() + '.html', output);
  }
}

async function generateIndex() {
  const filename = './lib/views/index.pug';
  const index = pug.compile(fs.readFileSync(filename, 'utf8'), { filename });

  const compiledPosts = await getCompiledPosts();

  const posts = [].concat(compiledPosts).reverse();
  const output = index({
    posts,
    allPosts: postsConfig
  });

  fs.writeFileSync('./bin/index.html', output);
  fs.writeFileSync('./bin/CNAME', 'thecodebarbarian.com');
}

async function generateRecommendations() {
  const filename = './lib/views/recommendations.pug';
  const options = { filename };
  options.filters = {
    markdown: function(block) {
      return markdown(block);
    }
  };
  const recommendations = pug.compile(fs.readFileSync(filename, 'utf8'), options);

  fs.writeFileSync('./bin/recommendations.html', recommendations(options));
}

async function generatePages() {
  const compiledPosts = await getCompiledPosts();
  const filename = './lib/views/list.pug';
  const listTemplate = pug.compile(fs.readFileSync(filename, 'utf8'), { filename });

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
}

async function generateFeed() {
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
}

module.exports = run;

run().catch(err => console.log(err));

async function run() {
  await Promise.all([
    generatePosts(),
    generateTags(),
    generateIndex(),
    generateRecommendations(),
    generatePages(),
    generateFeed()
  ]);

  console.log('Done');
}
