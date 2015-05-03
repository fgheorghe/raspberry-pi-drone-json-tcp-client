/**
 Copyright (c) 2015 Grosan Flaviu Gheorghe.
 All rights reserved.
 Redistribution and use in source and binary forms are permitted
 provided that the above copyright notice and this paragraph are
 duplicated in all such forms and that any documentation,
 advertising materials, and other materials related to such
 distribution and use acknowledge that the software was developed
 by Grosan Flaviu Gheorghe. The name of
 Grosan Flaviu Gheorghe may not be used to endorse or promote products derived
 from this software without specific prior written permission.
 THIS SOFTWARE IS PROVIDED ``AS IS'' AND WITHOUT ANY EXPRESS OR
 IMPLIED WARRANTIES, INCLUDING, WITHOUT LIMITATION, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 */

// TODO: Add rotate function.

/**
 * Provides joystick interaction logic.
 *
 * Required 'parameters' object keys are are:
 *
 * DroneTcpClient
 * Logger
 * Joystick: { DeviceID: 0 }
 *
 * @constructor
 */
var DroneJoystickController = function(parameters) {
    this.DroneTcpClient = parameters.DroneTcpClient;
    this.joystickDeviceId = parameters.Joystick.DeviceID;
    this.Logger = parameters.Logger;

    // Map initial motor power by ServoBlaster pins and default power of 0%.
    this.motorPower = [
        {
            // Pins based on: https://github.com/richardghirst/PiBits/tree/master/ServoBlaster
            Pin: 0,
            Power: 0 // %
        },{
            Pin: 1,
            Power: 0
        },{
            Pin: 2,
            Power: 0
        },{
            Pin: 3,
            Power: 0
        }
    ];

    // How often to send updates to drone.
    this.defaultUpdateInterval = 100;

    // Will host intervals for updating drone motor power.
    this.tAxisInterval = null;
    // Will host how much should the power change by at each T interval.
    this.tAxisPowerStep = 0;
    // Set to true by the 'panic button' and reset by a T axis value of 0. Prevents T axis updates.
    this.lockTAxis = false;
    // Holds the 'T' axis value.
    this.tAxisValue = 0;

    // Initialise controller.
    this.init();
}

/**
 * Loads dependencies, and grabs joystick device.
 *
 * @function
 */
DroneJoystickController.prototype.init = function() {
    this.joystick = new (require('joystick'))(this.joystickDeviceId);

    // Bind main joystick event handlers.
    this.joystick.on('button', this.JoystickButtonEventHandler.bind(this));
    this.joystick.on('axis', this.JoystickAxisEventHandler.bind(this));
}

/**
 * Joystick 'axis' event handler.
 *
 * @param event
 * @function
 */
DroneJoystickController.prototype.JoystickAxisEventHandler = function(event) {
    // Determine which type of Axis is being changed, and call a function to handle move.
    switch (event.number) {
        case 4: // T Axis.
            this.tAxisEventHandler.call(this, event.value);
            break;
        default:
            // Do nothing.
            break;
    }
}

/**
 * Handles a T Axis change, and increase / decrease throttle.
 *
 * @param value
 * @function
 */
DroneJoystickController.prototype.tAxisEventHandler = function(value) {
    var step = 0;
    this.tAxisValue = value;

    if (value > 0 && !this.lockTAxis) {
        // Slow down.
        step = -1;
    } else if (value < 0 && !this.lockTAxis) {
        // Speed up.
        step = 1;
    } else if (value === 0) {
        // Unlock T axis.
        if (this.lockTAxis) {
            this.lockTAxis = false;
        }
    }

    // Set interval step.
    this.tAxisPowerStep = step;

    // If step is 0, stop updating the drone.
    if (step === 0 && this.tAxisInterval) {
        clearInterval(this.tAxisInterval);
        this.tAxisInterval = null;
    } else if (step !== 0 && !this.tAxisInterval) {
        // Otherwise begin the throttle update interval - if not already started.
        this.tAxisInterval = setInterval(
            this.tAxisIntervalHandler.bind(this),
            this.defaultUpdateInterval
        );
    }
}

/**
 * The joystick module will only report a change once. Hence, we need to set an interval for
 * updating the drone as long as the T axis is not idle (=0).
 *
 * @function
 */
DroneJoystickController.prototype.tAxisIntervalHandler = function() {
    // Change motor power, in intervals.
    if (this.motorPower[0].Power + this.tAxisPowerStep >= 0 && this.motorPower[0].Power + this.tAxisPowerStep <= 100) {
        this.motorPower[0].Power = this.motorPower[0].Power + this.tAxisPowerStep;
    }
    if (this.motorPower[1].Power + this.tAxisPowerStep >= 0 && this.motorPower[1].Power + this.tAxisPowerStep <= 100) {
        this.motorPower[1].Power = this.motorPower[1].Power + this.tAxisPowerStep;
    }
    if (this.motorPower[2].Power + this.tAxisPowerStep >= 0 && this.motorPower[2].Power + this.tAxisPowerStep <= 100) {
        this.motorPower[2].Power = this.motorPower[2].Power + this.tAxisPowerStep;
    }
    if (this.motorPower[3].Power + this.tAxisPowerStep >= 0 && this.motorPower[3].Power + this.tAxisPowerStep <= 100) {
        this.motorPower[3].Power = this.motorPower[3].Power + this.tAxisPowerStep;
    }

    // Send values to drone server.
    this.DroneTcpClient.setMotorPower(this.motorPower);
}

/**
 * Joystick 'button' event handler.
 *
 * @param event
 */
DroneJoystickController.prototype.JoystickButtonEventHandler = function(event) {
    // Ignore a button release.
    if (event.value === 0) {
        return;
    }

    // Detect which button is pressed.
    switch (event.number) {
        // Panic button - set all power to 0. Clear all intervals.
        case 3:
            this.panicButtonEventHandler();
            break;
        default:
            // Do nothing.
            break;
    }
}

/**
 * Handles a 'panic' button press (button 3).
 *
 * @function
 */
DroneJoystickController.prototype.panicButtonEventHandler = function() {
    this.Logger.info("Panic button pressed.");

    // Lock t axis, to prevent updates while T axis is set back to 0.
    if (this.tAxisValue !== 0) {
        this.lockTAxis = true;
    }
    if (this.tAxisInterval) {
        clearInterval(this.tAxisInterval);
        this.tAxisInterval = 0;
    }
    this.tAxisPowerStep = 0;

    this.motorPower[0].Power = 0;
    this.motorPower[1].Power = 0;
    this.motorPower[2].Power = 0;
    this.motorPower[3].Power = 0;

    this.DroneTcpClient.setMotorPower(this.motorPower);
}

// Finally, export the module.
module.exports = DroneJoystickController;