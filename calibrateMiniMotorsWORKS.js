// with minPWM 0.002, flight at 0.054

var tessel = require('tessel');
var servolib = require('servo-pca9685'); // Or 'servo-pca9685' in your own code

var servo = servolib.use(tessel.port['C']);

var servoNumber = 1; // Plug your servo or motor controller into port 1

// Reenable the console
process.stdin.resume();
console.log('Type in numbers between 0.0 and 1.0 to command the servo.');
console.log('Values between 0.05 and 0.15 are probably safe for most devices,');
console.log('but be careful and work your way out slowly.');
servo.on('ready', function () {
  // Start at a duty cycle of 10%
  var duty = 0.1;
  // Set the min and max duty cycle to 0% and 100%, 
  // respectively to give you the maximum flexibility  
  // and to eliminate math
  servo.configure(1, 0, 1, function () {
    // Move into the starting position
    servo.move(1, duty, function(){
      servo.configure(2, 0, 1, function(){
        servo.move(2, duty, function(){
          servo.configure(3, 0, 1, function(){
            servo.move(3, duty, function(){
              servo.configure(4, 0, 1, function(){
                servo.move(4, duty)
              })
            })
          })
        })
      })
    });
    // Enter command positions into the command line. Work 
    // your way outwards until the servo begins to stall 
    // (or the motor velocity remains constant). Note the
    // max an min values and use them in this *physical* 
    // motor/controller channel's `configure` call.
    // Once you configure the motor, arguments to `move` of
    // 0 and 1 will correspond to the minimum and maximum
    // PWM values given in the `configure` call, thereby
    // allowing you to easily command the actuator through
    // its full range of motion.
    process.stdin.on('data', function (duty) {
      duty = parseFloat(String(duty));
      console.log('Setting command position:', duty);
            servo.move(1, duty);
            servo.move(2, duty);
            servo.move(3, duty);
            servo.move(4, duty);

    });
  });
});
