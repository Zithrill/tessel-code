// setTimeout(function(){
  var http = require('http');
  var tessel = require('tessel');
  var hover = require('./hover.js')
  var port = 8000;
  var host = '10.8.31.216';
  // var gpio = tessel.port['GPIO'];


  var server = http.createServer(function(req, res){

    if(req.method === 'OPTIONS'){
      res.writeHead(200, headers);
      res.end();
    }

    if(req.method === 'GET' && req.url === '/preflight'){
      console.log('takingOff');
      // hover.preflight();
      var statusCode = 200;
      var endData ='on';
    }    

    if(req.method === 'GET' && req.url === '/takeOff'){
      console.log('takingOff');
      hover.takeOff();
      var statusCode = 200;
      var endData ='on';
    }

    if(req.method === 'GET' && req.url === '/land'){
      console.log('landing');
      hover.land();
      var statusCode = 200;
      var endData = 'off';
    }

    var defaultCorsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
      "X-Requested-With": "*"
    };

    var headers = defaultCorsHeaders;
    res.writeHead(statusCode, headers);
    res.end(endData)
  }).listen(port, host);


  console.log('Tessel listening at http://', host, port);
// }, 60000)