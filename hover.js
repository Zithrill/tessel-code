var tessel = require('tessel');
var servolib = require('servo-pca9685');
var accel = require('accel-mma84').use(tessel.port['A']);
var servo = servolib.use(tessel.port['B']);

var startupTime = 1000; // Using 1000ms to delay rapid startup
var maxPWM = 0.125; // 
var minPWM = 0.002; // Exhaustively tested. 

var userSpeedIncrement = 0.05;
var userMaxSpeed = 0.15;
var accelThreshold = 0.1;

var servoModuleReady = false;
var accelModuleReady = false;

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

  configureMotor(1, hover);
  configureMotor(2, hover);
  configureMotor(3, hover);
  configureMotor(4, hover);
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
  servo.move(motor, 0);
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

  if(axis === 'y'){
    balanceMotors(1,3);
  }
  if(axis === 'x'){
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

hovering = true;
var isLanding = false;

//Replicate request from server to set hovering to false
setTimeout(function(){
  hovering = false;
} , 60000)

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
    servo.setDutyCycle(servoNumber, maxPWM, function (err) {
      setTimeout(function(){
        servo.setDutyCycle(servoNumber, minPWM, function (err) {
          setTimeout(function(){ 
            console.log(servoNumber+': ARMED');
            motors[servoNumber].configured = true;
            if(motors[1].configured && motors[2].configured && motors[3].configured && motors[4].configured){
              callback();
            } 
            // if all motors configured, do next thing.
          }, startupTime);
        });
      }, startupTime);
    });
  });
};
