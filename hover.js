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

var hasBeenCalled = false; //CHANGE VARIABLE NAME
var servoReady = false;
// var hovering;

servo.on('ready', function(){
  servoReady = true;
});

process.stdin.resume();

// Allow user to land immediately
process.stdin.on('data', function (throttle) {
  hovering = false;
  console.log('User ordered immediate landing', String(throttle));
  // userMaxSpeed = parseFloat(String(throttle));
  // console.log(userMaxSpeed)
});

accel.on('ready', function () {
  console.log('Accel module is ready.');
  //Old output rate too slow - This speeds up output rate
  accel.setOutputRate(800, function(err){
    var servos = {
      1: {
        motor: 1,
        speed: 0
      },
      2: {
        motor: 2,
        speed: 0
      },
      3: {
        motor: 3,
        speed: 0
      },
      4: {
        motor: 4,
        speed: 0
      }
    };

    servos['1'].oppositeMotor = servos['3'];
    servos['2'].oppositeMotor = servos['4'];
    servos['3'].oppositeMotor = servos['1'];
    servos['4'].oppositeMotor = servos['2'];

    var readAndUpdateSpeed = function(err, motor){
      if(err){console.log('err',err); throw err;}
      servo.read(motor, function (err, reading) {
        servos[motor].speed = reading;
        // Prettify throttle percentage output to console:
        var color = motor % 2 ? '\033[92m' : '\033[91m';
        console.log(color+motor+': '+(reading*100<10?' ':'')+(reading*100).toFixed(1)+'%'+'\033[97m');
      });
    };

    // var throttleUp = function(motor, deltaSpeed){
    //   var newSpeed = servos[motor].speed + deltaSpeed
    //   if (newSpeed <= userMaxSpeed && newSpeed >= 0 && newSpeed <= 1) {
    //     servo.move(motor, newSpeed, function(){
    //       readAndUpdateSpeed(err, motor);
    //     });
    //   } else {
    //     motor = servos[motor].oppositeMotor.motor;
    //     throttleDown(motor, deltaSpeed);
    //     // Figure out how to handle when we hit max
    //   }
    // };

    // var throttleDown = function(motor, deltaSpeed){
    //   var newSpeed = servos[motor].speed - deltaSpeed
    //   // console.log('throttleDown', motor, newSpeed)
    //   if (newSpeed <= userMaxSpeed && newSpeed >= 0 && newSpeed <= 1) {
    //     servo.move(motor, newSpeed, function(){
    //       readAndUpdateSpeed(err, motor); 
    //     });
    //   }
    // };

    var turnOn = function(motor){
      servo.move(motor, userMaxSpeed);
    };

    var turnOff = function(motor){
      servo.move(motor, 0);
    };


    var correction = function(axis, accelReading, cb){
      if(axis === 'y'){
        if(accelReading > accelThreshold){
          console.log('reading Y', accelReading)
          turnOff(1);
          turnOn(3);
          // throttleDown(servos[1].motor, userSpeedIncrement);
          //turn on one
          //turn off two
        }
        else if(accelReading < -1 * accelThreshold){
          console.log('reading Y', accelReading)
          turnOff(3);
          turnOn(1);
          // throttleDown(servos[3].motor, userSpeedIncrement);
        }
        // else{
        //   servo.move(1, userMaxSpeed, function(){
        //     readAndUpdateSpeed(err, 1);
        //   });
        //   servo.move(3, userMaxSpeed, function(){
        //     readAndUpdateSpeed(err, 3);
        //   });
        // }
      }
      //DUPLICATED CODE
      if(axis === 'x'){
        if(accelReading > accelThreshold){
          console.log('reading X', accelReading)
          turnOff(2);
          turnOn(4);
          // throttleDown(servos[2].motor, userSpeedIncrement);
        }
        else if(accelReading < -1 * accelThreshold){
          console.log('reading X', accelReading)
          turnOff(4);
          turnOn(2);          
          // throttleDown(servos[4].motor, userSpeedIncrement);
        }
        // else{
        //   servo.move(2, userMaxSpeed, function(){
        //     readAndUpdateSpeed(err, 2);
        //   });
        //   servo.move(4, userMaxSpeed, function(){
        //     readAndUpdateSpeed(err, 4);
        //   });
        // }
      }
      cb();
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
                if(servoNumber === 4 && !hasBeenCalled){
                  hasBeenCalled = true;
                  callback();
                }
              }, startupTime);
            });
          }, startupTime);
        });
      });
    };

    if(servoReady){
      console.log('Servo module is ready.');
      configureMotor(1, hover);
      configureMotor(2, hover);
      configureMotor(3, hover);
      configureMotor(4, hover);
    }

  });
});