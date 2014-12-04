var commander = require('commander');
var fs = require('fs');
var path = require('path');

commander.
  option('-p, --port <port>', 'Port to run on', Number).
  parse(process.argv);

require('http').createServer(function (request, response) {
  request.addListener('end', function() {
    console.log(request.url);
    // Backwards-compatible support for wordpress, because wordpress allows
    // URLs like `/2013/06/06/61/` to map to the blog post `61`
    if (request.url.length > 1 &&
        request.url.charAt(request.url.length - 1) === '/') {
      request.url = request.url.substr(0, request.url.length - 1);
    }

    var p = path.join('./bin', request.url);
    fs.stat(p, function(err, stats) {
      if (err || !stats) {
        response.writeHead(404, {
          'Cache-Control': 'max-age=7200',
          'Content-Type': 'text/plain'
        });
        return response.end("Not found");
      }
      if (stats.isFile()) {
        var type = path.extname(p);
        response.writeHead(200, {
          'Cache-Control': 'max-age=7200',
          'Content-Type': type || 'text/html'
        });
        fs.createReadStream(p).pipe(response);
      } else {
        var indexPath = path.join(p, 'index');
        fs.stat(indexPath, function(err, stats) {
          if (err || !stats || !stats.isFile()) {
            response.writeHead(404, {
              'Cache-Control': 'max-age=7200',
              'Content-Type': 'text/plain'
            });
            return response.end("Not found");
          }

          response.writeHead(200, {
            'Cache-Control': 'max-age=7200',
            'Content-Type': type || 'text/html'
          });
          fs.createReadStream(indexPath).pipe(response);
        });
      }
    });
  }).resume();
}).listen(process.env.TCB_PORT || commander.port || 8080);

console.log('Server listening on port ' + (process.env.TCB_PORT || commander.port || 8080));
