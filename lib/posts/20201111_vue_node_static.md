It's been nearly 6 years since [my last post about static site generators](/2015/02/06/static_site_generators), and
I still don't understand why there's a whole host of them. In my experience, static site generators like Hugo solve a
trivial problem badly, and leave you to clean up the mess. Thankfully, the Node.js ecosystem makes building a blog
as a static site easy: just choose your HTML templating language, pull in [marked](https://www.npmjs.com/package/marked)
to convert your blog posts from markdown to HTML, write a `for` loop to loop over all your posts, and you're done.

Picking a templating language for building your layout comes with a lot of tradeoffs, and I've used many different
ones. [This blog's layout is written in pug](https://github.com/vkarpov15/thecodebarbarian.com/blob/ecea0e6da455d9244560bdb1d219f657151d6da2/index.js#L65-L78). [Mastering JS' layout is written using ES6 template strings](https://github.com/vkarpov15/masteringjs.io/blob/d572347046846b02f0a404216b7fb1150be0e058/components/layout.js). Both Pug and template literals
have their advantages, but they share one key disadvantage: the layout itself isn't plain HTML, which means you need tooling
to get a preview of what your layout looks like. On the other hand, [Vue supports plain HTML templates](https://www.getrevue.co/profile/masteringjs/issues/building-and-testing-email-templating-using-vue-257729), which is why I'm building future blogs on Vue, and likely switching my existing blogs to Vue as well.

Setup
-----

The general idea of compiling a blog is taking an array of blog posts, compiling the corresponding markdown into HTML,
plugging it into an HTML layout, and creating a list view of the compiled blog posts. For example, say you have a
`my-first-blog-post.md` file:

```
This is my **first** blog post!
```

Here's an `index.js` file that you may use to compile this Markdown file into an `index.html` that lists blog posts
and a `my-first-blog-post.html` file that contains the body of the blog post.

```javascript
const fs = require('fs');
const marked = require('marked');

const posts = [
  {
    title: 'My First Blog Post',
    source: './my-first-blog-post.md',
    dest: './my-first-blog-post.html'
  }
];

for (const post of posts) {
  let content = fs.readFileSync(post.source, 'utf8');
  content = marked(content);
  fs.writeFileSync(post.dest, content);
  console.log('Wrote', post.dest);
}

fs.writeFileSync('./index.html', `
  <h1>Blog Posts</h1>
  ${posts.map(blogPostLink).join('\n')}
`);

function blogPostLink(post) {
  return `<div><a href="${post.dest}">${post.title}</a></div>`;
}
```

Yes, I'm not using [front matter](https://jekyllrb.com/docs/front-matter/). Front matter is neat, especially if you
have non-technical people contributing content, but I don't, so front matter isn't useful in this case.

Running the above script produces the below `my-first-blog-post.html` file:

```html
<p>This is my <strong>first</strong> blog post!</p>
```

And the below `index.html` file:

```html
  <h1>Blog Posts</h1>
  <div><a href="./my-first-blog-post.html">My First Blog Post</a></div>
```

Commit this code to GitHub, hook up [Netlify](https://www.netlify.com/), and you get a functioning proof of concept
for a blog.

Introducing vue-server-renderer
---------------

The above script works for creating a very simple blog with zero styling or layout. But the rough patches of working
with vanilla ES6 template literals are starting to show. For example, nesting template literals gets messy, which
is why there's a separate function for every blog post in `index.html`:

```javascript
fs.writeFileSync('./index.html', `
  <h1>Blog Posts</h1>
  ${posts.map(blogPostLink).join('\n')}
`);

// Would be nice if we didn't have to have this function:
function blogPostLink(post) {
  return `<div><a href="${post.dest}">${post.title}</a></div>`;
}
```

Plus, template strings mean you lose out on HTML syntax highlighting and the ability to preview your layout without
needing a compile step. Enter [vue-server-renderer](http://npmjs.com/package/vue-server-renderer), the most basic
way to handle [server side rendering with Vue](https://masteringjs.io/tutorials/vue/ssr). Let's `npm install`
the necessary packages:

```
npm install vue vue-server-renderer pretty
```

Next, let's write `list-template.html` and `post-template.html`. Our script will compile the `list-template.html` file
along with the list of blog posts into `index.html`, and `post-template.html` into each individual blog post. Below
is `list-template.html`:

```html
<div>
  <h1>My Blog</h1>
  <div v-for="post in posts">
    <a v-bind:href="post.dest" v-text="post.title">Sample Title</a>
  </div>
</div>
```

Note that, while there are some Vue-specific attributes, this HTML file renders normally in the browser. The only issue
is that the `a` tag doesn't have a `href`. Below is `post-template.html`:

```html
<div>
  <h1 v-text="title">Sample Title</h1>
  <div v-html="content">
    Sample Content
  </div>
</div>
```

Now, here's the modified `index.js`. The key difference is that, instead of using template literals to create HTML,
the below script uses vue-server-renderer's `renderToString()` function to compile a Vue app into HTML. Given an HTML
template and some data you want to use in the template, rendering the HTML is a 4-liner:

```javascript
const Vue = require('vue');
const fs = require('fs');
const marked = require('marked');
const pretty = require('pretty');
const { renderToString } = require('vue-server-renderer').createRenderer();

void async function main() {
  const posts = [
    {
      title: 'My First Blog Post',
      source: './my-first-blog-post.md',
      dest: './my-first-blog-post.html'
    }
  ];

  const postTemplate = fs.readFileSync('./post-template.html', 'utf8');

  for (const post of posts) {
    let content = fs.readFileSync(post.source, 'utf8');
    content = marked(content);
    const app = new Vue({
      template: postTemplate,
      data: () => ({ ...post, content })
    });
    // Write prettified HTML
    fs.writeFileSync(post.dest, pretty(await renderToString(app)));
    console.log('Wrote', post.dest);
  }

  const listTemplate = fs.readFileSync('./list-template.html', 'utf8');

  const app = new Vue({
    template: listTemplate,
    data: () => ({ posts })
  });

  // Write prettified HTML
  fs.writeFileSync('./index.html', pretty(await renderToString(app)));
}();
```

So for each page, this script creates a new Vue instance, passes in the correct template and data, and uses the
asynchronous `renderToString()` function to get HTML. This script then passes the output through `pretty()`, because
`renderToString()` always outputs minified HTML.

Below is the compiled `my-first-blog-post.html` file:

```html
<div data-server-rendered="true">
  <h1>My First Blog Post</h1>
  <div>
    <p>This is my <strong>first</strong> blog post!</p>
  </div>
</div>
```

And the compiled `index.html` file:

```html
<div data-server-rendered="true">
  <h1>My Blog</h1>
  <div><a href="./my-first-blog-post.html">My First Blog Post</a></div>
</div>
```

This new blog isn't much prettier, but it at least contains the basic framework for growing a more sophisticated
layout using Vue. Since layouts are plain HTML, you can easily pull in a layout that a professional designer put together,
or build one yourself. Plus, with Vue, you can use custom components, [`v-if`](https://masteringjs.io/tutorials/vue/v-if),
and other neat tools for organizing your templates.

Moving On
---------

Streamlining your blog's build process is key for both developer sanity and stability. One of the biggest benefits of
using a `for` loop instead of an established static site generator is that I haven't had to worry too much about my
build system. I've spent maybe 2 hours over the last 5 years working on the logic that compiles this blog from markdown
and pug, and that was just refactoring and upgrading Pug.

And, while I like using ES6 template literals because you
never need to update any dependencies, the benefits of writing layouts in plain `.html` files are just too good to
ignore. Plus Vue is exceptionally portable: use the same skills for building complex web apps and static sites, without
the heavy tooling requirements of tools like React. I'll be using Vue for blogs and static sites going forward.