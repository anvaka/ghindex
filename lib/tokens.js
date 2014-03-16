/**
 * Token service privdes to the client the best token to use for the
 * next request (best means most likely not expired)
 */

var config = require('./config');
var log = require('./log');
module.exports = function tokenService() {
  var allTokens = config.tokens.map(function (token) {
    return { token : token, lastExpired : +new Date() };
  });

  return {
    getNextAvailable : function () {
      // first element should be the one who expired longest time ago.
      // Assuming it has already restored its rate limit:
      return allTokens[0].token;
    },
    expire : function (token) {
      for (var i = 0; i < allTokens.length; ++i) {
        var record = allTokens[i];
        if (record.token === token) {
          record.lastExpired = +new Date();
          break;
        }
      }
      allTokens.sort(function (x, y) {
        // the smallest token should go first
        return x.lastExpired - y.lastExpired;
      });
      log('token ' + token + ' has expired. Switching to ' + allTokens[0].token);
    },
    enabled: allTokens.length > 0
  };
};
