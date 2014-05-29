/**
 * A silly "database" that writes json object into a file. This will be replaced
 */
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));

module.exports = function (fileName) {
  var content = getProcessedRepositories(fileName),
      waitBeforFlush = 0;

  return {
    save: save,
    flush: flush,
    getAll: function () { return content; }
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
    return waitBeforFlush > 500;
  }

  function getProcessedRepositories(dbFileName) {
    console.log('Initializing DB file', dbFileName);

    var records = {};
    try {
      records = JSON.parse(fs.readFileSync(dbFileName, 'utf8'));
      console.log('Read', Object.keys(records).length, 'records');
    }
    catch (e) {
      console.log('Could not read database file. Assuming it is empty.');
    }

    return records;
  }
};
