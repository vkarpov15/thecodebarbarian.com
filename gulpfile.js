var gulp = require('gulp');
var livereload = require('gulp-livereload');

var compiler = require('./');

gulp.task('compile', function() {
  compiler(function() {
    gulp.src('./bin/**').pipe(livereload());
  });
});

gulp.task('watch', function() {
  livereload.listen();
  gulp.watch('./lib/posts/*.md', ['compile']);
});