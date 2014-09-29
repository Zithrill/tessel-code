var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port['D']);
var servo = require('servo-pca9685').use(tessel.port['C']);
var mainControl = require('./mainControl.js');
var landController = require('./land.js');
var setThrottle = mainControl.setThrottle;

var hover = function(){
  //Gets accelerometer data from accelerometer (xyz);
  accel.getAcceleration(function(err, xyz){ // TODO would rather use accel.on('data', callback(xyz));
    //if still isHovering - go through event loop
    if(mainControl.isHovering){
      setTimeout(function(){
        loopx(xyz[0]);
      }, 0);
      setTimeout(function(){
        loopy(xyz[1]);
      }, 0);
    } else {
      if(!mainControl.isLanding){
        landController.land();
      }
    }
  });
};

var loopx = function(x){
  balanceAxis('x', x, function(){
    hover();
  });
};

var loopy = function(y){
  balanceAxis('y', y, function(){
    hover();
  });
};

var throttleUp = function(motorNumber){
  var motor = mainControl.motors[motorNumber];
  var proposedMotorThrottle = motor.currentThrottle+mainControl.minThrottleIncrement;
  if(proposedMotorThrottle <= mainControl.motorMaxThrottle){
    motor.setThrottle(proposedMotorThrottle);
  }
};

var throttleDown = function(motorNumber){
  var motor = mainControl.motors[motorNumber];
  var proposedMotorThrottle = motor.currentThrottle-mainControl.minThrottleIncrement;
  if(proposedMotorThrottle >= 0){
    motor.setThrottle(proposedMotorThrottle);
  }
};

var balanceAxis = function(axis, accelReading, callback){
  var balanceMotors = function(posMotor, negMotor){
    if(accelReading > mainControl.accelThresholdBeforeBalancing){
      throttleDown(posMotor);
      throttleUp(negMotor);
    }
    else if(accelReading < -1 * mainControl.accelThresholdBeforeBalancing){
      throttleDown(negMotor);
      throttleUp(posMotor);
    }
    else{
      throttleUp(posMotor);
      throttleUp(negMotor);
    }
  } 

  if(axis === 'x'){
    balanceMotors(1,3);
  }
  if(axis === 'y'){
    balanceMotors(2,4);
  }
  callback();
};


exports.hover = hover;

