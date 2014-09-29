var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port['D']);
var servo = require('servo-pca9685').use(tessel.port['C']);
var mainControl = require('./mainControl.js');
var balance = require('./balance.js');
var colorGreen = mainControl.colorGreen;
var checkMark = mainControl.checkMark;
var colorRed =  mainControl.colorRed;
var colorWhite =  mainControl.colorWhite;

servo.on('ready', function(){
  console.log('    Servo module ready.')
  mainControl.isServoModuleReady = true;
});

accel.on('ready', function () {
  console.log('    Accel module ready');
  accel.setOutputRate( mainControl.accelReadsPerSecond, function(err){
    accel.setScaleRange( mainControl.accelMaxGs, function(err){
      mainControl.isAccelModuleReady = true;
    });
  });
});

var armAndTakeOff = function(){
  var onModulesReady = function(){
    console.log(colorGreen+'    '+checkMark,'All Tessel modules ready.',colorWhite);
    console.log('  2.Arming motors:');
    mainControl.motors[1].arm();
    mainControl.motors[4].arm();
    mainControl.motors[3].arm();
    mainControl.motors[2].arm();
  };

  console.log('Pre-flight checklist:')
  console.log(' 1.Calibrating modules:')
  if(mainControl.isAccelModuleReady && mainControl.isServoModuleReady){ 
    onModulesReady();
  } else {
    console.log('not ready, try again');
  }
};

var preflightComplete = function(){
  console.log(colorGreen+'  '+checkMark,'Pre-flight complete.',colorWhite);  
  console.log('Hovering:')
  balance.hover();
};

var onMotorsArmed = function(){
  console.log(colorGreen+'    '+checkMark,'All motors armed.',colorWhite);
  preflightComplete();
};

exports.armAndTakeOff = armAndTakeOff;
exports.onMotorsArmed = onMotorsArmed;
exports.preflightComplete = preflightComplete;

