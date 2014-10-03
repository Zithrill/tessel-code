var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port['D']);
var servo = require('servo-pca9685').use(tessel.port['C']);
var mainControl = require('./mainControl.js');
var balance = require('./balance.js');
var hover = require('balance.js').hover;
var userReady= mainControl.userReady;

console.log('Pre-flight checklist:')
console.log(' 1.Calibrating modules:')
servo.on('ready', function(){
  console.log('    Servo module ready.')
  isServoModuleReady = true;
});

accel.on('ready', function () {
  console.log('    Accel module ready');
  accel.setOutputRate( accelReadsPerSecond, function(err){
    accel.setScaleRange( accelMaxGs, function(err){
      isAccelModuleReady = true;
    });
  });
});

var checkModules = function(){
  setImmediate(function(){
    if(isAccelModuleReady && isServoModuleReady){ 
      process.stdin.resume();
      servo.configure(1, 0, 1, function(){
        process.stdin.on('data', function (duty) {
          duty = parseFloat(duty);
          if(duty >= 0){
            servo.move(1, duty);
            motors[1].currentThrottle = duty;
            servo.configure(2, 0, 1, function(){
              servo.move(2, duty);
              motors[2].currentThrottle = duty;
            });
            servo.configure(3, 0, 1, function(){
              servo.move(3, duty);
              motors[3].currentThrottle = duty;
            });
            servo.configure(4, 0, 1, function(){
              servo.move(4, duty);
              motors[4].currentThrottle = duty;
            });
          } else {
            userReady = true;
          }
        });
      });   
    } else {
      checkModules();
    }
  })
};



checkModules();



