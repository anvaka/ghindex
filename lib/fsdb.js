/**
 * A silly "database" that writes json object into a file
 */
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));

module.exports = function (fileName) {
  var content = {};

  return {
    save: save,
    flush: flush
  };

  function save(key, value) {
    content[key] = value;
    return needsFlush() ? flush() : Promise.resolve();
  }

  function flush() {
    waitBeforFlush = 0;
    console.log('Writing collected records to', fileName);
    return fs.writeFile(fileName, JSON.stringify(content));
  }

  function needsFlush() {
    // this is just random. Could be changed later.
    waitBeforFlush++;
    return waitBeforFlush > 1;
  }
};
