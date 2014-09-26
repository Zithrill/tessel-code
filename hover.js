var tessel = require('tessel');
var servolib = require('servo-pca9685');
var accel = require('accel-mma84').use(tessel.port['D']);
var servo = servolib.use(tessel.port['C']);

var startupTime = msBetweenMaxAndMinPWM = msBetweenMinPWMAndCallback = 1000; // Using 1000ms to delay rapid startup
var maxPWM = 0.125;
var minPWM = 0.002; // Exhaustively tested. 

var userSpeedIncrement = 0.05;
var testSpeed = 0.02;
var userMaxSpeed = testSpeed;// 0.4; 
var accelThreshold = 0.003;
var whatIsZero = 0.004;

var servoModuleReady = false;
var accelModuleReady = false;

var hovering = true;
var isLanding = false;

//Replicate request from server to set hovering to false
setTimeout(function(){
  hovering = false;
} , 60000)

// Set motors to zero for safety:
servo.move(1, 0);
servo.move(2, 0);
servo.move(3, 0);
servo.move(4, 0);


servo.on('ready', function(){
  servoModuleReady = true;
  if(accelModuleReady && servoModuleReady){ 
    onModulesReady();
  }
});

accel.on('ready', function () {
  //Old output rate too slow - This speeds up output rate
  accel.setOutputRate(800, function(err){
    accelModuleReady = true;
    if(accelModuleReady && servoModuleReady){ 
      onModulesReady();
    }
  });
});

var onModulesReady = function(){
  // Allow user to land immediately
  process.stdin.resume();
  process.stdin.on('data', function (throttle) {
    hovering = false;
    console.log('User ordered immediate landing', String(throttle));
  });
  setTimeout(function(){
    configureMotor(1, hover);
  },1000)
  setTimeout(function(){
    configureMotor(2, hover);
  },2000)
  setTimeout(function(){
    configureMotor(3, hover);
  },3000)
  setTimeout(function(){
    configureMotor(4, hover);
  },4000)
};

var onMotorsConfigured = function(){}; // ;)

var motors = {
  1: {
    motor: 1,
    speed: 0,
    configured: false
  },
  2: {
    motor: 2,
    speed: 0,
    configured: false
  },
  3: {
    motor: 3,
    speed: 0,
    configured: false
  },
  4: {
    motor: 4,
    speed: 0,
    configured: false
  }
};

motors['1'].oppositeMotor = motors['3'];
motors['2'].oppositeMotor = motors['4'];
motors['3'].oppositeMotor = motors['1'];
motors['4'].oppositeMotor = motors['2'];

var turnOnMotor = function(motor){
  servo.move(motor, userMaxSpeed);
};

var turnOffMotor = function(motor){
  servo.move(motor, whatIsZero);
};

var balanceAxis = function(axis, accelReading, callback){
  var balanceMotors = function(posMotor, negMotor){
    if(accelReading > accelThreshold){
      turnOffMotor(posMotor);
      turnOnMotor(negMotor);
    }
    else if(accelReading < -1 * accelThreshold){
      turnOffMotor(negMotor);
      turnOnMotor(posMotor);
    }
    else{ // all off
      turnOnMotor(posMotor);
      turnOnMotor(negMotor);
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
  accel.getAcceleration(function(err, xyz){
    //if still hovering - go through event loop
    if(hovering){
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

var land = function(){
  isLanding = true;
  servo.move(1, 0);
  servo.move(2, 0);
  servo.move(3, 0);
  servo.move(4, 0);
  console.log('Landed. All motors should be off.');
};

var configureMotor = function (servoNumber, callback) {
  console.log('Configuring motor '+servoNumber+'...');
  servo.configure(servoNumber, minPWM, maxPWM , function () {
    // Set maxPWM
    servo.setDutyCycle(servoNumber, maxPWM, function (err) {
      setTimeout(function(){
        // Set minPWM
        servo.setDutyCycle(servoNumber, minPWM, function (err) {
          setTimeout(function(){ 
            console.log(servoNumber+': ARMED');
            // If this is the last motor to arm, have it invoke the callback.
            motors[servoNumber].configured = true;
            if(motors[1].configured && motors[2].configured && motors[3].configured && motors[4].configured){
              callback();
            } 
          }, msBetweenMinPWMAndCallback);
        });
      }, msBetweenMaxAndMinPWM);
    });
  });
};
