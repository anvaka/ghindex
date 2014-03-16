var Q = require('q');
var qs = require('querystring');
var request = require('request');
var log = require('./log');

module.exports = function (tokens) {
  var endpoint = 'https://api.github.com';

  return {
    findRepo: function (q) {
      var requests = [];
      for (var i = 0; i < 10; ++i){
        requests.push(searchRequest(i + 1));
      }

      return Q.all(requests).then(combine);

      function searchRequest(page) {
        var deferred = Q.defer();
        var currentToken = tokens.getNextAvailable();

        var search = endpoint + '/search/repositories?q=' + q + '&' + qs.stringify({
          access_token: currentToken,
          page: page,
          per_page: 100,
          sort: 'stars'
        });

        var requestParams = {url: search, headers: { 'User-Agent': 'anvaka/gazer' }};
        log('getting ' + search);

        request(requestParams, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            deferred.resolve(extractFields(data.items));
          } else if (!error && /API rate limit exceeded/.test(response.body)) {
            // next iteration should use another token:
            log(response.body);
            tokens.expire(currentToken);
            searchRequest(page).then(function (items) {
              deferred.resolve(items);
            });
          } else {
            log('Error:', error, response.body);
            deferred.reject(error);
          }
        });

        return deferred.promise;
      }

      function combine(pages) {
        var result = [];
        pages.forEach(function (page) { result = result.concat(page); });
        return result.sort(function (a, b) {
          return b.watchers - a.watchers;
        });
      }

      function writeOutput(repositories) {
      }
    }
  };
};

function extractFields(items) {
  return items.map(function (item) {
    return {
      username: item.owner.login,
      name: item.full_name,
      description: item.description,
      language: item.language,
      watchers: item.watchers,
      forks: item.forks
    };
  });
}
