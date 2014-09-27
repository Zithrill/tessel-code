// ###############################
// NOTES
/* ###############################

If no input command is received for about 1 second, f3 f2 is beeped and the ESC returns to disarmed state, waiting for a valid arming signal.
try using process.end

*///##############################
// REQUIREMENTS
// ###############################
var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port['D']);
var servo = require('servo-pca9685').use(tessel.port['C']);

// ###############################
// SETTINGS
// ###############################
// Throttle settings
var msBetweenMaxAndMinPWM = 1000; // Using 1000ms to delay rapid startup
var msBetweenMinPWMAndCallback = 1000;
var maxPWM = 0.125;
var minPWM = 0.002; // Exhaustively tested. 

var motorMaxThrottle = 0.05; 
var minThrottleIncrement = 0.02;
// var maxDifferenceBetweenAxes = 0.1;

// Sensor Calibrations
var accelMaxGs = 2; // in g's, possible values: 2 4 8
var accelThresholdBeforeBalancing = 0.03;
var accelReadsPerSecond = 250;

// Control flow variables
var isServoModuleReady = false;
var isAccelModuleReady = false;
var isHovering = true;
var isLanding = false;

// Logging stuff
var colorGreen = '\033[92m';
var checkMark = '\u2714';
var colorRed = '\033[91m';
var colorWhite = '\033[97m';
var log = console.log;
var staticLog = function(infoOn1, infoOn2, infoOn3, infoOn4){
  process.stdout.write('\u001B[2J\u001B[0;0f'
    +'Motor throttles:\n'
    +'1: '+infoOn1+'\n'
    +'2: '+infoOn2+'\n'
    +'3: '+infoOn3+'\n'
    +'4: '+infoOn4
  );
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

function arm() {
  var servoNumber = this.number;
  servo.configure(servoNumber, minPWM, maxPWM , function (err) {
    log('    '+servoNumber,'configured.',err?err:'');
    // Set maxPWM
    servo.setDutyCycle(servoNumber, maxPWM, function (err) {
      log('    '+servoNumber,'max PWM set.',err?err:'');
      setTimeout(function(){
        // Set minPWM
        servo.setDutyCycle(servoNumber, minPWM, function (err) {
          log('    '+servoNumber,'min PWM set.',err?err:'');
          setTimeout(function(){ 
            log('    '+servoNumber,'armed.');
            // If this is the last motor to arm, have it invoke the callback.
            motors[servoNumber].armed = true;
            if(motors[1].armed && motors[2].armed && motors[3].armed && motors[4].armed){
              onMotorsArmed();
            } 
          }, msBetweenMinPWMAndCallback);
        });
      }, msBetweenMaxAndMinPWM);
    });
  });
};

// e.g. motors[1].setThrottle(.2);
function setThrottle(throttle){
  //TODO 'this' probably not correct.
  servo.move(this.number, throttle, function(err){
    this.currentThrottle = throttle;
    staticLog(motors[1].currentThrottle, motors[2].currentThrottle, motors[3].currentThrottle, motors[4].currentThrottle);
  });
}

// ###############################
// PRE-FLIGHT
// ###############################
log('Pre-flight checklist:')
log(' 1.Calibrating modules:')
servo.on('ready', function(){
  log('    Servo module ready.')
  isServoModuleReady = true;
  if(isAccelModuleReady && isServoModuleReady){ 
    onModulesReady();
  }
});

accel.on('ready', function () {
  log('    Accel module ready');
  accel.setOutputRate( accelReadsPerSecond, function(err){
    accel.setScaleRange( accelMaxGs, function(err){
      isAccelModuleReady = true;
      if(isAccelModuleReady && isServoModuleReady){ 
        onModulesReady();
      }
    });
  });
});

var onModulesReady = function(){
  log(colorGreen+'    '+checkMark,'All Tessel modules ready.',colorWhite);
  log('  2.Arming motors:');
  // setTimeout(function(){
    motors[1].arm();
    motors[2].arm();
    motors[3].arm();
    motors[4].arm();
  // },1000);
};

var onMotorsArmed = function(){
  log(colorGreen+'    '+checkMark,'All motors armed.',colorWhite);
  preflightComplete();
};

var preflightComplete = function(){
  log(colorGreen+'  '+checkMark,'Pre-flight complete.',colorWhite);  
  log('Hovering:')
  hover();
}

// ###############################
// HOVER
// ###############################
var throttleUp = function(motorNumber){
  var motor = motors[motorNumber];
  var proposedMotorThrottle = motors[motorNumber].currentThrottle+minThrottleIncrement;
  if(proposedMotorThrottle <= motorMaxThrottle){
    motor.setThrottle(proposedMotorThrottle);
  }
};
var throttleDown = function(motorNumber){
  var motor = motors[motorNumber];
  var proposedMotorThrottle = motor.currentThrottle-minThrottleIncrement;
  if(proposedMotorThrottle >= 0){
    motor.setThrottle(proposedMotorThrottle);
  }
};

var balanceAxis = function(axis, accelReading, callback){
  var balanceMotors = function(posMotor, negMotor){
    if(accelReading > accelThresholdBeforeBalancing){
      throttleDown(posMotor);
      throttleUp(negMotor);
    }
    else if(accelReading < -1 * accelThresholdBeforeBalancing){
      throttleDown(negMotor);
      throttleUp(posMotor);
    }
    else{ //if(Math.abs(evenAxisAverageThrottle-oddAxisAverageThrottle) < maxDifferenceBetweenAxes){ // when balanced, increase throttles to max.
      throttleUp(posMotor);
      throttleUp(negMotor);
    }
  } 
  // var oddAxisAverageThrottle = (motors[1].throttle+motors[3].throttle)/2;
  // var evenAxisAverageThrottle = (motors[2].throttle+motors[4].throttle)/2;

  if(axis === 'x'){
    balanceMotors(1,3);
  }
  if(axis === 'y'){
    balanceMotors(2,4);
  }

  callback();
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

var hover = function(){
  //Gets accelerometer data from accelerometer (xyz);
  accel.getAcceleration(function(err, xyz){ // TODO would rather use accel.on('data', callback(xyz));
    //if still isHovering - go through event loop
    if(isHovering){
      setTimeout(function(){
        loopx(xyz[0]);
      }, 0);

      setTimeout(function(){
        loopy(xyz[1]);
      }, 0);
    } else {
      if(!isLanding){
        land();
      }
    }
  });
};

// ###############################
// LAND
// ###############################
var land = function(){
  isLanding = true;
  motors[1].setThrottle(0);
  motors[2].setThrottle(0);
  motors[3].setThrottle(0);
  motors[4].setThrottle(0);
  log('Landed. All motors should be off.');
};
