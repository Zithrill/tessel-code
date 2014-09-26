// 0.0022 minimum

/* Notes
 * #1 is backward.
 * #2 is 
 * #3 is
 * #4 is
 */

var maxPWM = 0.125;
var minPWM = 0.002;

var tessel = require('tessel');
var servolib = require('servo-pca9685'); // Or '' in your own code

var servo = servolib.use(tessel.port['C']);

process.stdin.resume();

servo.on('ready', function () {
  console.log('servo module ready');
  servo.configure(1, 0, 1, function () {
    console.log('1 configured');
    servo.move(1, maxPWM, function(){
      servo.move(1, minPWM, function(){console.log('1 Armed')})
    });
    servo.configure(2, 0, 1, function () {
      console.log('2 configured');
      servo.move(2, maxPWM, function(){
        servo.move(2, minPWM, function(){console.log('2 Armed')})
      });
      servo.configure(3, 0, 1, function () {
        console.log('3 configured');
        servo.move(3, maxPWM, function(){
          servo.move(3, minPWM, function(){console.log('3 Armed')})
        });
        servo.configure(4, 0, 1, function () {
          console.log('4 configured');
          servo.move(4, maxPWM, function(){
            servo.move(4, minPWM, function(){console.log('4 Armed')})
          });
          // Accept user input to control motors individually.
          process.stdin.on('data', function (input) {
            // console.log('motor# [space] throttle# [enter]')
            // var motor = parseInt(String(input).split(' ')[0]);
            var value = parseFloat(String(input)); //.split(' ')[1]);
            // console.log(motor+':', value);
            servo.move(1, value);
            servo.move(2, value);
            servo.move(3, value);
            servo.move(4, value);
          });
        });
      });
    });
  });
});
  