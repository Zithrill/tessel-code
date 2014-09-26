// Program flow:

var drone = {
  motors: {
    1: {speed: function(){}, armed: false, arm: function(){}, liftoffSpeed: null},
    2: {speed: function(){}, armed: false, arm: function(){}, liftoffSpeed: null},
    3: {speed: function(){}, armed: false, arm: function(){}, liftoffSpeed: null},
    4: {speed: function(){}, armed: false, arm: function(){}, liftoffSpeed: null}
  },
  accel: {calibrate: function(){}},
  gyro: {calibrate: function(){}},
  magnetometer: {calibrate: function(){}},
  downSonar: {calibrate: function(){}},
  turretSonar: {calibrate: function(){}},
  takeoff: function(){},
  hover: function(altitude){altitude = altitude || 1; /* in meters */ },
  land: function(){}
};

// PRE-FLIGHT
drone.motors[1].speed();
// Immediately shut off each motor in case it has residual throttle.
for(var motor in drone.motors){
  var motor = drone.motors[motor];
  motor.speed(0); // (If motors aren't armed, this should have no effect.)
}

// Check and calibrate available sensors.
drone.accel.calibrate();
drone.gyro.calibrate();
drone.magnetometer.calibrate();
drone.downSonar.calibrate();
drone.turretSonar.calibrate();

// Arm each motor.
for(motor in drone.motors){
  var motor = drone.motors[motor];
  if( !motor.armed )
    motor.arm();
}

// Calibrate motors
for(motor in drone.motors){
  var motor = drone.motors[motor];
  var increase = 0;
  while(drone.accel.level){
    motor.speed(increase);
    increase += speedIncrement;
  }
  motor.liftoffSpeed = increase;
  // Compare that speed to known liftoff to determine throttle % mapping?
  motor.speed(0);
}

// Results: sensors and motors calibrated and armed, all throttles at 0. 

// TAKE-OFF
drone.takeoff();
drone.hover();
