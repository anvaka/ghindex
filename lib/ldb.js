/**
 * Promisifed leveldb wrapper
 */
var Promise = require('bluebird');
var level = require('level');

module.exports = function (dbName) {
  if (!dbName) throw new Error('Database name is missing');
  var db = level(dbName, {valueEncoding: 'json'});

  var content = {},
      waitBeforeFlush = 0;

  return {
    save: save,
    flush: flush,
    forEach: function (callback) {
      return new Promise(function (resolve, reject) {
        db.createReadStream()
          .on('data', function (data) {
            callback(data.key, data.value);
          })
          .on('error', reject)
          .on('end', resolve);
      });
    },
    getAllKeys: function () {
      return new Promise(function (resolve, reject) {
        var keys = [];
        db.createKeyStream()
          .on('data', function (data) { keys.push(data); })
          .on('error', reject)
          .on('end', function () { resolve(keys); });
      });
    },
    getAllKeyValues: function (keys) {
      var result = Object.create(null);
      var nothing = {};
      return Promise.all(keys.map(getKey)).then(returnResult);

      function getKey(key) {
        return new Promise(function (resolve, reject) {
          db.get(key, function (err, value) {
            if (err) {
              console.log('Error while geting', key, ': ', err);
              resolve(nothing);
              return;
            }
            result[key] = value;
            resolve(value);
          });
        });
      }

      function returnResult() {
        return result;
      }
    }
  };

  function save(key, value) {
    content[key] = value;
    return needsFlush() ? flush() : Promise.resolve();
  }

  function flush() {
    waitBeforeFlush = 0;
    var keys = Object.keys(content);
    var writeOps = keys.map(function (name) {
      return { type: 'put', key: name, value: content[name] };
    });

    console.log('Writing collected records to', dbName);

    return new Promise(function (resolve, reject) {
      db.batch(writeOps, function (err) {
        if (err) reject(err);
        else resolve();
      });
    }).then(function () {
      content = {};
      console.log('Saved records to database: ', keys.length);
    });
  }

  function needsFlush() {
    // this is just random. Could be changed later.
    waitBeforeFlush++;
    return waitBeforeFlush > 50;
  }
};
