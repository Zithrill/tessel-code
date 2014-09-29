// ###############################
// NOTES
/* ###############################

- If no input command is received for about 1 second, f3 f2 is beeped and the ESC returns to disarmed state, waiting for a valid arming signal.

- Try using process.end

- Disconnect battery for at least 10s between flights to let ESCs discharge capacitors.

- Try making motors arm one at a time slow enough for a human to hear errors. 4x|: f1 . f1 f1 f3 :|

- Increase throttle increment 0.05.

- Increase accelerometer threshold to 0.06.

- Balance the hardware (#3 heavy).

*///##############################
// REQUIREMENTS
// ###############################
var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port['D']);
var servo = require('servo-pca9685').use(tessel.port['C']);
var preflight = require('./preflight.js');

// ###############################
// SETTINGS
// ###############################
// Throttle settings
var msBetweenMaxAndMinPWM = 1000; // Using 1000ms to delay rapid startup
var msBetweenMinPWMAndCallback = 1000;
var maxPWM = 0.125;
var minPWM = 0.002; // Exhaustively tested. 

var motorMaxThrottle = 0.4; 
var minThrottleIncrement = 0.02;
var maxThrottleDifference = 0.1;

// Sensor Calibrations
var accelMaxGs = 2; // in g's, possible values: 2 4 8
var accelThresholdBeforeBalancing = 0.03;
var accelReadsPerSecond = 250;

// Control flow variables
var isServoModuleReady = false;
var isAccelModuleReady = false;
var isHovering = true;
var isLanding = false;

// Logging settings
var colorGreen = '\033[92m';
var checkMark = '\u2714';
var colorRed = '\033[91m';
var colorWhite = '\033[97m';

var staticLog = function(motor1, motor2, motor3, motor4){
  // process.stdout.write('\u001B[2J\u001B[0;0f'
  //   +'Motor throttles:\n'
  //   +'1: '+motor1.toFixed(3)+'\n'
  //   +'2: '+motor2.toFixed(3)+'\n'
  //   +'3: '+motor3.toFixed(3)+'\n'
  //   +'4: '+motor4.toFixed(3)+'\n'
  //   +'A: '+((motor1+motor2+motor3+motor4)/4).toFixed(3)
  // );
};

//Motor Specific Functions

var arm = function() {
  var servoNumber = this.number;
  servo.configure(servoNumber, minPWM, maxPWM , function (err) {
    console.log('    '+servoNumber,'configured.',err?err:'');
    // Set maxPWM
    servo.setDutyCycle(servoNumber, maxPWM, function (err) {
      console.log('    '+servoNumber,'max PWM set.',err?err:'');
      setTimeout(function(){
        // Set minPWM
        servo.setDutyCycle(servoNumber, minPWM, function (err) {
          console.log('    '+servoNumber,'min PWM set.',err?err:'');
          setTimeout(function(){ 
            console.log('    '+servoNumber,'armed.');
            // If this is the last motor to arm, have it invoke the callback.
            motors[servoNumber].armed = true;
            if(motors[1].armed && motors[2].armed && motors[3].armed && motors[4].armed){
              preflight.onMotorsArmed();
            } 
          }, msBetweenMinPWMAndCallback);
        });
      }, msBetweenMaxAndMinPWM);
    });
  });
};

// e.g. motors[1].setThrottle(.2);
var setThrottle = function(throttle){
  //TODO 'this' probably not correct.
  var motor = this;
  var previousThrottle = motor.currentThrottle;
  motor.currentThrottle = throttle;
  if(Math.max(motors[1].currentThrottle, motors[2].currentThrottle, motors[3].currentThrottle, motors[4].currentThrottle) - Math.min(motors[1].currentThrottle, motors[2].currentThrottle, motors[3].currentThrottle, motors[4].currentThrottle) <= maxThrottleDifference){
    servo.move(this.number, throttle, function(err){
      motor.currentThrottle = throttle;
      staticLog(motors[1].currentThrottle, motors[2].currentThrottle, motors[3].currentThrottle, motors[4].currentThrottle);
    });
  } else {
    motor.currentThrottle = previousThrottle;
  }
};

// Motor calibrations
var motors = {
  1: {
    number: 1,
    currentThrottle: 0,
    setThrottle: setThrottle,
    arm: arm,
    armed: false
  },
  2: {
    number: 2,
    currentThrottle: 0,
    setThrottle: setThrottle,
    arm: arm,
    armed: false
  },
  3: {
    number: 3,
    currentThrottle: 0,
    setThrottle: setThrottle,
    arm: arm,
    armed: false
  },
  4: {
    number: 4,
    currentThrottle: 0,
    setThrottle: setThrottle,
    arm: arm,
    armed: false
  }
};

motors[1].oppositeMotor = motors[3];
motors[2].oppositeMotor = motors[4];
motors[3].oppositeMotor = motors[1];
motors[4].oppositeMotor = motors[2];

exports.setThrottle = setThrottle;
exports.motors = motors;
exports.colorGreen = colorGreen;
exports.checkMark = checkMark;
exports.colorRed =  colorRed;
exports.colorWhite =  colorWhite;
exports.accelReadsPerSecond = accelReadsPerSecond;
exports.accelMaxGs = accelMaxGs;
exports.accelThresholdBeforeBalancing = accelThresholdBeforeBalancing;
exports.isLanding = isLanding;
exports.isHovering = isHovering;
exports.motorMaxThrottle = motorMaxThrottle;
