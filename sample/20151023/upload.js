var assert = require('assert');
var fs = require('fs');
var mongodb = require('mongodb');

var uri = 'mongodb://localhost:27017/test';

mongodb.MongoClient.connect(uri, function(error, db) {
  assert.ifError(error);

  var bucket = new mongodb.GridFSBucket(db, {
    chunkSizeBytes: 1024,
    bucketName: 'songs'
  });

  fs.createReadStream('./meistersinger.mp3').
    pipe(bucket.openUploadStream('meistersinger.mp3')).
    on('error', function(error) {
      assert.ifError(error);
    }).
    on('finish', function() {
      console.log('done!');
      process.exit(0);
    });
});
