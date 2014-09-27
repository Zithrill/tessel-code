
var tessel = require('tessel');
var servolib = require('servo-pca9685'); // Or 'servo-pca9685' in your own code
var servo = servolib.use(tessel.port['C']);

// Reenable the console
process.stdin.resume();
console.log('Type in numbers between 0.0 and 1.0 to command the servo.');
console.log('Values between 0.05 and 0.15 are probably safe for most devices,');
console.log('but be careful and work your way out slowly.');
servo.on('ready', function () {
  for(var servoNumber = 1; servoNumber <= 16; servoNumber++){
    // var maxPWM = 0.125;
    // var minPWM = 0.002;
    servo.configure(servoNumber, minPWM || 0, maxPWM || 1);
  }
  process.stdin.on('data', function (duty) {
    duty = parseFloat(String(duty));
    for(var servoNumber = 1; servoNumber <= 16; servoNumber++){
      servo.move(servoNumber, duty);
    }
  });
});
