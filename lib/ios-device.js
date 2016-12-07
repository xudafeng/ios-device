'use strict';

const path = require('path');
const EOL = require('os').EOL;

const _ = require('./helper');
const binName = 'ios-deploy';

let iOSDeployBin = _.lookupBin(path.join(__dirname, '..', 'node_modules'), binName);
if (!iOSDeployBin) {
  // Try to use global binary
  iOSDeployBin = binName
}

function Device(options) {
  options = options || {};
  this.deviceId = options.deviceId || null;
  // Number of seconds to wait for a device to be connected.
  this.timeout = options.timeout || 5;
}

Device.prototype.setDeviceId = function(deviceId) {
  this.deviceId = deviceId;
};

Device.prototype.setTimeoutForConnect = function(timeout) {
  this.timeout = timeout;
};

Device.prototype._setDefaultArgs = function() {
  this.defaultArgs = [];
  this.deviceId && this.defaultArgs.push('-i', this.deviceId);
  this.timeout && this.defaultArgs.push('-t', this.timeout);
};

Device.prototype._exec = function() {
  const args = Array.prototype.slice.call(arguments);
  const cmd = this.defaultArgs.concat(args);
  return _.spawn(iOSDeployBin, cmd);
};

Device.prototype.installAndLaunch = function(appPath) {
  return this._exec('-L', '-b', appPath);
};

Device.prototype.uninstall = function(bundleId) {
  return this
    .exists(bundleId)
    .then(existed => {
      if (!existed) {
        console.log('BundleId ' + bundleId + ' does not exist.');
      }
      return this._exec('-9', '-1', bundleId);
    })
};

Device.prototype.exists = function(bundleId) {
  return this
    ._exec('-e', '-1', bundleId)
    .then(std => {
      const stdout = std[0];
      return stdout.includes('true');
    })
    .catch(err => {
      // Error code turned to be 255 when bundleId does not exist
      // In other case, we just rethrow the error
      if (err.code === 255) {
        return false;
      }
      throw err;
    });
};

Device.prototype.listInstalledApps = function() {
  return this
    ._exec('-B')
    .then(std => {
      const stdout = std[0];
      const list = stdout.split(EOL).filter(line => line && !line.startsWith('['));
      return list;
    });
};

Device.isConnected = function(udid, waitForSeconds) {
  const cmd = ['-c'];
  if (waitForSeconds) {
    cmd.push('-t', waitForSeconds);
  }
  return _.spawn(iOSDeployBin, cmd)
    .then(std => {
      const stdout = std[0];
      const devices = stdout
        .split(EOL)
        .filter(line => line.includes('Found'));
      if (udid) {
        return devices.some(deviceStr => deviceStr.includes(udid));
      }
      return Boolean(devices.length);
    });
};

Object.defineProperty(Device.prototype, "deviceId", {
  get: function() {
    return this._deviceId;
  },
  set: function(deviceId) {
    this._deviceId = deviceId;
    this._setDefaultArgs();
  }
});

Object.defineProperty(Device.prototype, "timeout", {
  get: function() {
    return this._timeout;
  },
  set: function(timeout) {
    this._timeout = timeout;
    this._setDefaultArgs();
  }
});

module.exports = Device;
