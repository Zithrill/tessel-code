var tessel = require('tessel');
var wifi = require('wifi-cc3000');
var ws = require("nodejs-websocket");

//Used for test accel data
var accel = require('accel-mma84').use(tessel.port['A']);
var accelData ={x:0,y:0,z:0};

// ###############################
// ACCELEROMETER SETUP
// this can be replaced with the 
// modulirized code as long as we
// can access the accelData
// ###############################

// Initialize the accelerometer.
accel.on('ready', function () {
    // Stream accelerometer data
  accel.on('data', function (xyz) {
    accelData.x = xyz[0];
    accelData.y = xyz[1];
    accelData.z = xyz[2];
  });

});

accel.on('error', function(err){
  console.log('Error:', err);
});

// ###############################
// SERVER SETUP
// ###############################

var startServer = function () {
  var port = 8000;
  var dataOn = null;
  var server = ws.createServer(function (conn) {
    console.log("New connection");
    conn.on("text", function (str) {
      // This will basicly be our control switch
      if (str === 'land') {
      console.log("Received " + str)

      } else if (str === 'takeOff') {
        console.log("Received " + str)
        // This is temp code and will need to be rewritten such that 
        // when the connection closes this on data is removed
        accel.on('data', function (xyz) {
          accelData.x = xyz[0];
          accelData.y = xyz[1];
          accelData.z = xyz[2];
          conn.sendText("X-Axis: " + accelData.x + "\nY-Axis: " + accelData.y + "\nZ-Axis: " + accelData.z);
        });
      } else if (str === 'preflight') {
        console.log("Received " + str)
      } else {
        console.log("Invalid Command: ", str);
      }
    });

    // When the client closes the connection, notify us.
    // This is where there should be clean up of listeners
    // if 
    conn.on("close", function (code, reason) {
        console.log("Connection closed")
    });
  }).listen(port);

  console.log('listening on port', port);
};


// ###############################
// WIFI SETUP
// ###############################

var network = 'Hack Reactor';
var pass = 'awesomebullets';
var security = 'wpa2';

// Connect to the wifi network
var connect = function () {
  wifi.connect({
    security: security,
    ssid: network,
    password: pass,
    timeout: 30 // In seconds
  });
};

// Check if the wifi chip is busy (currently trying to connect), if not, try to connect
var tryConnect = function () {
  if (!wifi.isBusy()) {
    connect();
  } else {
    // For the first few seconds of program bootup, you'll always 
    // see the wifi chip as being 'busy'
    console.log('is busy, trying again');
    setTimeout(function () {
      tryConnect();
    }, 1000);
  }
};

wifi.on('connect', function (err, data) {
  // Start the server up
  console.log('connect emitted', err, data);
  startServer();
});

wifi.on('disconnect', function (err, data) {
  // Wifi dropped, want to call connect() again?
  // Also immediate stop to all motors
  console.log('disconnect emitted', err, data);
});

wifi.on('timeout', function (err) {
  // Tried to connect but couldn't, retry
  console.log('timeout emitted', err);
  connect();
});

wifi.on('error', function (err) {
  // One of the following happened
  // 1. tried to disconnect while not connected
  // 2. tried to disconnect while in the middle of trying to connect
  // 3. tried to initialize a connection without first waiting for a timeout or a disconnect
  // Result make sure that motors are shutoff!
  console.log('error emitted', err);
});

// ###############################
// START THE SERVER
// ###############################

tryConnect();

