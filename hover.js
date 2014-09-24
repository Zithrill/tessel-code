var tessel = require('tessel');
var accel = require('accel-mma84').use(tessel.port['A']);
var servolib = require('servo-pca9685');
var servo = servolib.use(tessel.port['B']);


//continue to updated servo obj speeds with servo reads

var startupTime = 800; // 500 < minStartupTime? < 1000 in ms
var maxPWM = 0.125; // 
var minPWM = 0.002; // Exhaustively tested. 

var hasBeenCalled = false;

var userSetSpeed = 0.005;

var userInputMaxSpeed = 0.15;

var servoReady = false;

var threshold = 0.06;

servo.on('ready', function(){
  servoReady = true;
});

// process.stdin.resume();

// process.stdin.on('data', function (throttle) {
//   userInputMaxSpeed = parseFloat(String(throttle));
//   console.log(userInputMaxSpeed)
// });

accel.on('ready', function () {
  console.log('accel ready')
  //Old output rate too slow - This speeds up output rate
  accel.setOutputRate(800, function(err){
    
    console.log('accel set output');



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

    var throttleUp = function(motor, deltaSpeed){
      var newSpeed = servos[motor].speed + deltaSpeed
      if (newSpeed <= userInputMaxSpeed && newSpeed >= 0 && newSpeed <= 1) {
        servos[motor].speed = newSpeed;
        servo.move(motor, newSpeed, function(err){
          console.log('motor',motor,'throttle up to', newSpeed);
          if (err) {
            console.log(err);
          }
        });
      } else {
        motor = servos[motor].oppositeMotor.motor;
        throttleDown(motor, deltaSpeed);
        // Figure out how to handle when we hit max
      }
    };

    var throttleDown = function(motor, deltaSpeed){
      var newSpeed = servos[motor].speed - deltaSpeed
      console.log('throttleDown', motor, newSpeed)
      if (newSpeed <= userInputMaxSpeed && newSpeed >= 0 && newSpeed <= 1) {
        console.log('if');
        servo.move(motor, newSpeed, function(err){
          servos[motor].speed = newSpeed;
          console.log('motor',motor,'throttle down to', newSpeed);
          if (err) {
            console.log(err);
          }
        });
      }
    };


     
    var correction = function(axis, accelReading, cb){
      if(axis === 'y'){
        if(accelReading > threshold){
          throttleDown(servos[1].motor, userSetSpeed);
        }
        else if(accelReading < -1 * threshold){
          throttleUp(servos[3].motor, userSetSpeed);
        }
        else{
          servo.move(1, userInputMaxSpeed);
          servo.move(3, userInputMaxSpeed);
        }
        //motor 1
        // console.log('CORRECTING POS Y', axis, value.toFixed(2))
      }
      // else if(axis === 'y' && value < -1 * threshold){
      //   //motor 3
      //   // console.log('CORRECTING NEG Y', axis, value.toFixed(2))
      // }
      if(axis === 'x'){
        if(accelReading > threshold){
          throttleDown(servos[2].motor, userSetSpeed);
        }
        else if(accelReading < -1 * threshold){
          throttleUp(servos[4].motor, userSetSpeed);
        }
        else{
          servo.move(2, userInputMaxSpeed);
          servo.move(4, userInputMaxSpeed);
          console.log('servo 4 moving max')
        }
        //motor 2
        // console.log('CORRECTING POS X', axis, value.toFixed(2))
      }
      // else if(axis === 'x' && value < -1 * threshold){
      //   //motor 4
      //   // console.log('CORRECTING NEG X', axis, value.toFixed(2))
      // }
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

    var hovering = true;
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
      console.log('landed');
    };

    var configureMotor = function (servoNumber, callback) {
      servo.read(servoNumber, function (err, reading) {
        console.log('ready reading:', reading);
        servo.configure(servoNumber, minPWM, maxPWM , function () {
          servo.read(servoNumber, function (err, reading) {
            console.log('configure reading:', reading);
            servo.setDutyCycle(servoNumber, maxPWM, function (err) {
              servo.read(servoNumber, function (err, reading) {
                console.log('setDutyCycle max reading:', reading)
                setTimeout(function(){
                  servo.setDutyCycle(servoNumber, minPWM, function (err) {
                    servo.read(servoNumber, function (err, reading) {
                      console.log('setDutyCycle min reading:', reading)
                      setTimeout(function(){ 
                        console.log('Armed');
                        if(servoNumber === 4 && !hasBeenCalled){
                          hasBeenCalled = true;
                          callback();
                        }
                      }, startupTime);
                    });
                  });
                }, startupTime);
              });
            });
          });
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

accel.on('error', function(err){
  console.log('Error:', err);
});


