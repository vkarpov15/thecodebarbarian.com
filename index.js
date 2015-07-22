var _ = require('underscore');
var fs = require('fs');
var markdown = require('marked');
var jade = require('jade');
var file = require('file');

var highlight = require('highlight.js');
markdown.setOptions({
  highlight: function(code) {
    return highlight.highlightAuto(code).value;
  }
});

var wagner = require('wagner-core');

var posts = require('./lib/posts');
var postsConfig = _.sortBy(posts, function(post) { return -post.date.unix(); });

var templates = {
  index: null,
  post: null,
  list: null
};
var postsContent = {};
var postBySource = {};

var loadTemplate = function(path, key) {
  return function(callback) {
    fs.readFile(path, function(err, view) {
      if (err) {
        console.log('Error loading index template: ' + err);
        return callback(err);
      }
      var result = jade.compile(view, { filename: path });
      callback(null, result);
    });
  };
};

wagner.task('index', loadTemplate('./lib/views/index.jade', 'index'));
wagner.task('postTemplate', loadTemplate('./lib/views/post.jade', 'post'));
wagner.task('listTemplate', loadTemplate('./lib/views/list.jade', 'list'));

wagner.task('posts', function(callback) {
  wagner.parallel(
    posts,
    function(post, key, callback) {
      fs.readFile(post.src, function(error, md) {
        post.md = md.toString();
        callback(error, post);
      });
    },
    callback);
});

var tasks = ['loadIndex'];
var tags = {};
_.each(posts, function(post) {
  _.each(post.tags || [], function(tag) {
    tags[tag] = tags[tag] || [];
    tags[tag].unshift(post);
  });
});

wagner.task('compiledPosts', function(posts, postTemplate, callback) {
  wagner.parallel(
    posts,
    function(post, key, callback) {
      var output = postTemplate({
        post: post,
        content: markdown(post.md.toString()),
        allPosts: postsConfig
      });

      post.compiled = output;
      post.preview = markdown(post.md.substr(0, post.md.indexOf('\n')));
      callback(null, post);
    },
    callback);
});

wagner.task('generatePosts', function(compiledPosts, callback) {
  console.log('Generating posts');
  wagner.parallel(
    compiledPosts,
    function(post, key, callback) {
      console.log('Generating "' + post.title + "'");
      file.mkdirs(post.dest.directory, 0777, function(err) {
        if (err) {
          console.log('Error making dir: ' + err);
          return callback(err);
        }
        fs.writeFile(file.path.join(post.dest.directory, post.dest.name),
          post.compiled, function(err) {
            if (err) {
              console.log('Error writing file: ' + err);
              return callback(err);
            }
            return callback(null);
        });
      });
    },
    callback);
});

wagner.task('tags', function(compiledPosts, listTemplate, callback) {
  for (var key in compiledPosts) {
    compiledPosts[key] = compiledPosts[key].result;
  }

  wagner.parallel(
    tags,
    function(tag, key, callback) {
      var output = listTemplate({
        tag: key,
        posts: tag,
        allPosts: postsConfig,
        pageNum: 0,
        isLastPage: false
      });

      fs.writeFile('./bin/tag/' + key.toLowerCase(), output, function(err) {
        if (err) {
          console.log('Error writing file: ' + err);
          return callback(err);
        }
        return callback(null);
      });
    }, callback);
});

wagner.task('compiledIndex', function(compiledPosts, index, callback) {
  var posts = _.map(compiledPosts, function(p) {
    return p;
  });
  var output = index({
    posts: posts.reverse(),
    allPosts: postsConfig
  });
  fs.writeFile('./bin/index', output, function(err) {
    if (err) {
      console.log('Error writing index: ' + err);
      return callback(err);
    }
    return callback(null);
  });
});

wagner.task('pages', function(compiledPosts, listTemplate, callback) {
  var posts = _.map(compiledPosts, function(p) {
    return p;
  });

  var pages = [];
  var reversed = posts.reverse();
  for (var i = 8; i < posts.length; i += 8) {
    pages.push(listTemplate({
      tag: 'Page ' + Math.floor(i / 8),
      posts: reversed.slice(i, i + 8),
      allPosts: postsConfig,
      pageNum: Math.floor(i / 8),
      isLastPage: !(i + 8 < posts.length)
    }));
  }

  wagner.parallel(pages, function(page, index, callback) {
    fs.writeFile('./bin/page/' + (index + 1), page, function(err) {
      callback(err);
    });
  }, callback);
});

wagner.invokeAsync(function(error, compiledIndex, pages, generatePosts, tags) {
  if (error) {
    return console.log('Errors occurred: ' + error + '\n' + error.stack);
  }
  console.log('Done');
});

module.exports = function(cb) {
  wagner.invokeAsync(function(error, compiledIndex, generatePosts, tags) {
    if (error) {
      cb(error);
      return console.log('Errors occurred: ' + error + '\n' + error.stack);
    }
    cb();
    console.log('Done');
  });
};
