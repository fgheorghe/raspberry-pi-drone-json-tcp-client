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
/**
 * Drone TCP Client.
 *
 * Require 'parameters' keys are:
 *
 * Host
 * Port
 * Logger
 *
 * @constructor
 */
var DroneTcpClient = function(parameters) {
    // Prepare configuration.
    this.Host = parameters.Host;
    this.Port = parameters.Port;
    this.Logger = parameters.Logger;

    // Set to true once a connection has been made.
    this.connected = false;

    // Initialise client.
    this.init();
}

/**
 * Initialize client.
 *
 * @function
 */
DroneTcpClient.prototype.init = function() {
    this.jsonClient = require('json-over-tcp');
    this.socket = this.jsonClient.connect(this.Port, this.Host, this.ClientConnectEventHandler.bind(this));
}

/**
 * Client connection handler.
 *
 * @function
 */
DroneTcpClient.prototype.ClientConnectEventHandler = function() {
    this.Logger.info("Connected to drone: host " + this.Host + ", port " + this.Port);
    // Set status to connected.
    this.connected = true;
}

/**
 * Sets motors power.
 *
 * @param motorPower A array pin, power pairs. Pins based on:
 * https://github.com/richardghirst/PiBits/tree/master/ServoBlaster. Power is in %.
 */
DroneTcpClient.prototype.setMotorPower = function(motorPower) {
    this.Logger.debug(JSON.stringify(motorPower));
    // Only write data when a socket is available.
    if (this.connected) {
        this.socket.write({ Power: motorPower });
    } else {
        this.Logger.error("Not connected to drone! Can not send data.");
    }
}

// Finally, export the module.
module.exports = DroneTcpClient;