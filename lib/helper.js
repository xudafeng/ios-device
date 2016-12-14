'use strict';

const path = require('path');
const fs = require('fs');
let xutil = require('xutil');
let childProcess = require('child_process');

var _ = xutil.merge({}, xutil);

_.exec = function(cmd, opts) {
  return new Promise(function(resolve, reject) {
    childProcess.exec(cmd, _.merge({
      maxBuffer: 1024 * 512,
      wrapArgs: false
    }, opts || {}), function(err, stdout, stderr) {
      if (err) {
        return reject(err);
      }
      resolve([stdout, stderr]);
    });
  });
};

_.spawn = function() {
  var args = Array.prototype.slice.call(arguments);
  return new Promise(function(resolve, reject) {
    var stdout = '';
    var stderr = '';
    var child = childProcess.spawn.apply(childProcess, args);

    child.on('error', function(error) {
      reject(error);
    });

    child.stdout.on('data', function(data) {
      stdout += data;
    });

    child.stderr.on('data', function(data) {
      stderr += data;
    });

    child.on('close', function(code) {
      var error;
      if (code) {
        error = new Error(stderr);
        error.code = code;
        return reject(error);
      }
      resolve([stdout, stderr]);
    });
  });
};

_.sleep = function(ms) {
  return new Promise(function(resolve) {
    setTimeout(resolve, ms);
  });
};

_.execPromiseGenerator = function(cmd, cb) {
  var promise = _.exec(cmd);

  if (cb) {
    return promise.then(data => {
      cb.call(this, null, data);
    }).catch(err => {
      cb.call(this, `exec ${cmd} error with: ${err}`);
    });
  } else {
    return promise;
  }
};

_.lookupBin = function(filePath, binName) {
  try {
    const binDir = path.join(filePath, binName);
    const binPkg = path.join(binDir, 'package.json');
    const bin = path.join(binDir, require(binPkg)['bin']);
    // ensure bin exists.
    fs.accessSync(bin);
    return bin;
  } catch (e) {}
}

module.exports = _;
