var commander = require('commander');
var fs = require('fs');
var path = require('path');

commander.
  option('-p, --port <port>', 'Port to run on', Number).
  parse(process.argv);

require('http').createServer(function (request, response) {
  request.addListener('end', function() {
    console.log(request.url);
    var p = path.join('./bin', request.url);
    fs.stat(p, function(err, stats) {
      if (err || !stats || !stats.isFile()) {
        response.writeHead(404, {
          'Cache-Control': 'max-age=7200',
          'Content-Type': 'text/plain'
        });
        return response.end("Not found");
      }
      var type = path.extname(p);
      response.writeHead(200, {
        'Cache-Control': 'max-age=7200',
        'Content-Type': type || 'text/html'
      });
      fs.createReadStream(p).pipe(response);
    });
  }).resume();
}).listen(commander.port || 8080);

console.log('Server listening on port ' + (commander.port || 8080));
