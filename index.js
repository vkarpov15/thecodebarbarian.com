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
  highlight: function(code, language) {
    if (language && language.toLowerCase() === 'javascript') {
      return highlight.highlight('JavaScript', code).value;
    }
    if (language && language.toLowerCase() === 'typescript') {
      return highlight.highlight('TypeScript', code).value;
    }
    return code;
  }
});

const posts = require('./lib/posts');
const postsConfig = [].concat(posts).reverse();

// Display names for tags. A post with several tags shows the first one listed
// here as its topic, so more specific topics come first.
const topicLabels = {
  asyncawait: 'Async/Await',
  Vue: 'Vue',
  AngularJS: 'AngularJS',
  MongoDB: 'MongoDB',
  NodeJS: 'Node.js',
  Paleo: 'Paleo',
  Random: 'Random'
};

for (const post of posts) {
  post.url = (post.dest.directory.substr('./bin'.length) + '/' + post.dest.name + '.html').replace(/\/+/g, '/');
  const topic = Object.keys(topicLabels).find(tag => (post.tags || []).includes(tag));
  post.topic = topicLabels[topic];
}

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

// Plain text for post cards. Cards are links, so summaries can't contain the
// links and other markup that markdown renders. The result stays HTML-escaped.
function getSummary(post) {
  const sources = [post.previewText].concat(post.md.split(/\n\s*\n/)).filter(Boolean);
  for (const source of sources) {
    const text = markdown(source).replace(/<[^>]*>/g, '').trim();
    if (text.length > 0) {
      return text;
    }
  }
  return '';
}

// The post's top-level headings, for the "On this page" table of contents. Newer
// posts divide into sections with h2s and some older ones use h1s.
function getTableOfContents(html) {
  const headings = Array.from(html.matchAll(/<h([1-6]) id="([^"]+)">([\s\S]*?)<\/h\1>/g)).
    map(match => ({ level: +match[1], id: match[2], text: match[3].replace(/<[^>]*>/g, '').trim() }));
  const topLevel = Math.min(...headings.map(heading => heading.level));

  return headings.filter(heading => heading.level === topLevel);
}

async function getCompiledPosts() {
  const posts = await getPosts();

  const filename = './lib/views/post.pug';
  const postTemplate = pug.compile(fs.readFileSync(filename, 'utf8'), { filename });

  for (const post of posts) {
    post.rawPreview = post.md.substr(0, post.md.indexOf('\n'));
    post.summary = getSummary(post);

    const content = markdown(post.md.toString());
    const output = postTemplate({
      post: post,
      content,
      allPosts: postsConfig,
      toc: getTableOfContents(content)
    });

    post.compiled = output;
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
  await getCompiledPosts();

  const filename = './lib/views/list.pug';
  const listTemplate = pug.compile(fs.readFileSync(filename, 'utf8'), { filename });

  for (const key of Object.keys(tags)) {
    const output = listTemplate({
      tag: topicLabels[key] || key,
      posts: [].concat(tags[key]),
      allPosts: postsConfig,
      pageNum: 0,
      isLastPage: false
    });

    fs.writeFileSync('./bin/tag/' + key.toLowerCase() + '.html', output);
  }
}

// Home page sponsors: active Open Collective sponsors, downloaded by
// `npm run sponsors`, with hand-maintained changes from sponsors-overrides.json.
// Both files are gitignored. The overrides file has:
//
// - `overrides`: fields to replace on an Open Collective sponsor, keyed by the
//   sponsor's `profile` URL, like a different `website` to link to.
// - `additionalSponsors`: sponsors who aren't on Open Collective, like ones who
//   pay directly through Stripe, with `name`, `website` and `image`.
//
// Either can set `alt` for the logo's alt text and tooltip, which defaults to `name`.
function getSponsors() {
  const openCollective = readSponsors('./data/opencollective.json',
    'Run `npm run sponsors` to download it.');
  const { overrides = {}, additionalSponsors = [] } = readSponsors('./data/sponsors-overrides.json',
    'Create it with `overrides` and `additionalSponsors`, or {} if there are none.');

  for (const profile of Object.keys(overrides)) {
    if (!openCollective.some(member => member.profile === profile)) {
      console.warn('Sponsor override for ' + profile + ' matches no active Open Collective sponsor');
    }
  }

  return openCollective.
    map(member => Object.assign({}, member, overrides[member.profile])).
    concat(additionalSponsors).
    map(sponsor => ({
      name: sponsor.name,
      href: sponsor.website || sponsor.profile,
      image: sponsor.image,
      alt: sponsor.alt || sponsor.name
    }));
}

// Fails rather than rendering without the file's sponsors, so a fresh clone
// can't silently compile a home page that's missing them.
function readSponsors(filename, help) {
  if (!fs.existsSync(filename)) {
    throw new Error(filename + ' not found. ' + help);
  }
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

async function generateIndex() {
  const sponsors = getSponsors();

  const filename = './lib/views/index.pug';
  const index = pug.compile(fs.readFileSync(filename, 'utf8'), { filename });

  const compiledPosts = await getCompiledPosts();

  const posts = [].concat(compiledPosts).reverse();
  const output = index({
    posts,
    sponsors,
    allPosts: postsConfig,
    current: 'home'
  });

  fs.writeFileSync('./bin/index.html', output);
  fs.writeFileSync('./bin/CNAME', 'thecodebarbarian.com');
}

async function generateAllPosts() {
  const filename = './lib/views/posts.pug';
  const template = pug.compile(fs.readFileSync(filename, 'utf8'), { filename });

  const years = [];
  const byDate = [].concat(posts).sort((a, b) => b.date - a.date);
  for (const post of byDate) {
    const year = post.date.year();
    if (years.length === 0 || years[years.length - 1].year !== year) {
      years.push({ year, posts: [] });
    }
    years[years.length - 1].posts.push(post);
  }

  const topics = Object.keys(tags).
    sort((a, b) => tags[b].length - tags[a].length).
    map(tag => ({ label: topicLabels[tag] || tag, url: '/tag/' + tag.toLowerCase() + '.html' }));

  fs.writeFileSync('./bin/posts.html', template({
    years,
    topics,
    postCount: posts.length,
    current: 'posts'
  }));
}

async function generateEbooks() {
  const filename = './lib/views/ebooks.pug';
  const ebooks = pug.compile(fs.readFileSync(filename, 'utf8'), { filename });

  fs.writeFileSync('./bin/ebooks.html', ebooks());
}

// Posts that moved list their old paths as `aliases`, so old links keep working.
async function generateRedirects() {
  const filename = './lib/views/redirect.pug';
  const redirect = pug.compile(fs.readFileSync(filename, 'utf8'), { filename });

  for (const post of posts) {
    for (const alias of post.aliases || []) {
      fs.writeFileSync(alias, redirect({ post }));
    }
  }
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
      link: 'https://thecodebarbarian.com' + posts[i].dest.directory.substr('./bin'.length) + '/' + posts[i].dest.name + '.html',
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
    generateAllPosts(),
    generateEbooks(),
    generateRedirects(),
    generatePages(),
    generateFeed()
  ]);

  console.log('Done');
}
