var port = process.env.PORT || 3000;

var http = require('http');
var sys  = require('util');
var fs   = require('fs');

var blacklist = [];
var iplist    = [];

fs.watchFile('./blacklist', function(c,p) { update_blacklist(); });
fs.watchFile('./iplist', function(c,p) { update_iplist(); });

function update_blacklist() {
  sys.log("Updating blacklist.");
  blacklist = fs.readFileSync('./blacklist', 'utf8').split('\n')
              .filter(function(rx) { return rx.length })
              .map(function(rx) { return RegExp(rx) });
}

function update_iplist() {
  sys.log("Updating iplist.");
  iplist = fs.readFileSync('./iplist', 'utf8').split('\n')
           .filter(function(rx) { return rx.length });
}

function ip_allowed(ip) {
  for (i in iplist) {
    if (iplist[i] == ip) {
      return true;
    }
  }
  console.log(iplist);
  return false;
}

function host_allowed(host) {
  for (i in blacklist) {
    if (blacklist[i].test(host)) {
      return false;
    }
  }
  return true;
}

function deny(response, msg) {
  response.writeHead(401);
  response.write(msg);
  response.end();
}

http.createServer(function(request, response) {
  var ip = request.headers['x-forwarded-for'].split(',')[0];
  if (!ip_allowed(ip)) {
    msg = "IP " + ip + " is not allowed to use this proxy";
    deny(response, msg);
    sys.log(msg);
    return;
  }

  if (!host_allowed(request.url)) {
    msg = "Host " + request.url + " has been denied by proxy configuration";
    deny(response, msg);
    sys.log(msg);
    return;
  }

  sys.log(ip + ": " + request.method + " " + request.url);
  var proxy = http.createClient(80, request.headers['host'])
  request.headers['x-forwarded-for'] = '';
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
update_iplist();