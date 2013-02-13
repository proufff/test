var port = process.env.PORT || 3000;

var http = require('http');
var sys  = require('sys');
var fs   = require('fs');

var blacklist = [];

fs.watchFile('./blacklist', function(c,p) { update_blacklist(); });

function update_blacklist() {
  sys.log("Updating blacklist.");
  blacklist = fs.readFileSync('./blacklist').split('\n')
              .filter(function(rx) { return rx.length })
              .map(function(rx) { return RegExp(rx) });
}

http.createServer(function(request, response) {
  for (i in blacklist) {
    if (blacklist[i].test(request.url)) {
      sys.log("Denied: " + request.method + " " + request.url);
      response.end();
      return;
    }
  }

  sys.log(request.connection.remoteAddress + ": " + request.method + " " + request.url);
  var proxy = http.createClient(80, request.headers['host'])
  var proxy_request = proxy.request(request.method, request.url, request.headers);
  proxy_request.addListener('response', function(proxy_response) {
    proxy_response.addListener('data', function(chunk) {
      response.write(chunk, 'binary');
    });
    proxy_response.addListener('end', function() {
      response.end();
    });
    response.writeHead(proxy_response.statusCode, proxy_response.headers);
  });
  request.addListener('data', function(chunk) {
    proxy_request.write(chunk, 'binary');
  });
  request.addListener('end', function() {
    proxy_request.end();
  });
}).listen(port);

update_blacklist();