var mainControl = require('./mainControl.js');
var tessel = require('tessel');
var servo = require('servo-pca9685').use(tessel.port['C']);
var setThrottle = mainControl.setThrottle;

var land = function(){
  mainControl.isLanding = true;
  mainControl.motors[1].setThrottle(0);
  mainControl.motors[2].setThrottle(0);
  mainControl.motors[3].setThrottle(0);
  mainControl.motors[4].setThrottle(0);
  console.log('Landed. All motors should be off.');
};

exports.land = land;