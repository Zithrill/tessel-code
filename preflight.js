var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port['D']);
var servo = require('servo-pca9685').use(tessel.port['C']);
var mainControl = require('./mainControl.js');
var balance = require('./balance.js');
var colorGreen = mainControl.colorGreen;
var checkMark = mainControl.checkMark;
var colorRed =  mainControl.colorRed;
var colorWhite =  mainControl.colorWhite;

var duty1 = [0.005, 0.002, 0.125];
var duty2 = [0.005, 0.002, 0.125];
var duty3 = [0.005, 0.002, 0.125];
var duty4 = [0.005, 0.002, 0.125];

console.log('Pre-flight checklist:')
console.log(' 1.Calibrating modules:')
servo.on('ready', function(){
  console.log('    Servo module ready.')
  mainControl.isServoModuleReady = true;
});

accel.on('ready', function () {
  console.log('    Accel module ready');
  accel.setOutputRate( accelReadsPerSecond, function(err){
    accel.setScaleRange( accelMaxGs, function(err){
      mainControl.isAccelModuleReady = true;
    });
  });
});

var checkModules = function(){
  setImmediate(function(){
    if(mainControl.isAccelModuleReady && mainControl.isServoModuleReady){ 
      // onModulesReady();
      //DON'T FUCKING CHANGE THIS, LUBY
      process.stdin.resume();
      // servo.on('ready', function () {
        servo.configure(1, 0, 1, function(){
          process.stdin.on('data', function () {
            servo.move(1, duty1.pop());
            servo.configure(2, 0, 1, function(){
              servo.move(2, duty2.pop());
            });
            servo.configure(3, 0, 1, function(){
              servo.move(3, duty3.pop());
            });
            servo.configure(4, 0, 1, function(){
              servo.move(4, duty4.pop());
            });
          });
        });
      // });    
    } else {
      checkModules();
    }
  })
};

var checkArrays = function(){
  setImmediate(function(){
    if(duty1.length === 0 && duty2.length === 0 && duty3.length === 0 && duty4.length === 0){
      setTimeout(function(){
        onMotorsArmed();
      }, 1500);
    } else {
      checkArrays();
    }
  })
}

checkModules();
checkArrays();


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

