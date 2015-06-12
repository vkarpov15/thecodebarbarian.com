var express = require('express');

var app = express();
app.use(require('morgan')());
app.use(express.static('./'));

app.listen(3000);
