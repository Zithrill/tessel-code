var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port['A']);
var servolib = require('servo-pca9685');
var servo = servolib.use(tessel.port['B']);

//continue to updated servo obj speeds with servo reads

var startupTime = 800; // 500 < minStartupTime? < 1000 in ms
var maxPWM = 0.125; // 
var minPWM = 0.002; // Exhaustively tested. 

var userSpeedIncrement = 0.05;
var userMaxSpeed = 0.15;
var accelThreshold = 0.2;

var servoModuleReady = false;
var accelModuleReady = false;

servo.on('ready', function(){
  servoModuleReady = true;
  if(accelModuleReady && servoModuleReady){ 
    control();
  }
});

accel.on('ready', function () {
  //Old output rate too slow - This speeds up output rate
  accel.setOutputRate(800, function(err){
    accelModuleReady = true;
    if(accelModuleReady && servoModuleReady){ 
      control();
    }
  });
})

// MAIN CONTROL LOOP
var control = function(){
  process.stdin.resume();

  // Allow user to land immediately
  process.stdin.on('data', function (throttle) {
    hovering = false;
    console.log('User ordered immediate landing', String(throttle));
  });


  configureMotor(1, hover);
  configureMotor(2, hover);
  configureMotor(3, hover);
  configureMotor(4, hover);

};

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

// var readAndUpdateSpeed = function(err, motor){
//   if(err){console.log('err',err); throw err;}
//   servo.read(motor, function (err, reading) {
//     motors[motor].speed = reading;
//     // Prettify throttle percentage output to console:
//     var color = motor % 2 ? '\033[92m' : '\033[91m';
//     console.log(color+motor+': '+(reading*100<10?' ':'')+(reading*100).toFixed(1)+'%'+'\033[97m');
//   });
// };

var turnOnMotor = function(motor){
  servo.move(motor, userMaxSpeed);
};

var turnOffMotor = function(motor){
  servo.move(motor, 0);
};

var correction = function(axis, accelReading, callback){
  if(axis === 'y'){
    if(accelReading > accelThreshold){
      console.log('reading Y', accelReading)
      turnOffMotor(1);
      turnOnMotor(3);
    }
    else if(accelReading < -1 * accelThreshold){
      console.log('reading Y', accelReading)
      turnOffMotor(3);
      turnOnMotor(1);
    }
    else{
      turnOffMotor(1);
      turnOffMotor(3);
    }
  }
  //DUPLICATED CODE
  if(axis === 'x'){
    if(accelReading > accelThreshold){
      console.log('reading X', accelReading)
      turnOffMotor(2);
      turnOnMotor(4);
    }
    else if(accelReading < -1 * accelThreshold){
      console.log('reading X', accelReading)
      turnOffMotor(4);
      turnOnMotor(2);          
    }
    else {
      turnOffMotor(2);
      turnOffMotor(4);
    }
  }
  callback();
};

var loopx = function(x){
  correction('x', x, function(){
    hover();
  });
};

var loopy = function(y){
  correction('y', y, function(){
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
