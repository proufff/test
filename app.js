var express = require('express');
var app = express.createServer();
var port = 8080;
 
app.get('/', function(request, response) {
   response.send('Hello Engine Yard Cloud!');
});
 
app.listen(port);