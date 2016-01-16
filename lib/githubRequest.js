module.exports = githubRequest;

var P = require('bluebird');
var request = require('request-promise');
var errors = require('request-promise/errors');

function githubRequest(options, followNext) {
  var allPages;
  var failedCount = 0;

  if (followNext) allPages = [];

  return makeRequest(options);

  function makeRequest(options) {
    return request(options)
      .then(verifyRateLimits)
      .catch(errors.StatusCodeError, handleStatusCode);
  }

  function handleStatusCode(reason) {
    failedCount += 1;
    if (reason.statusCode === 403) {
      failedCount = 0;
      var headers = reason.response.headers;
      var body = JSON.parse(reason.response.body);
      if (body.block) {
        // This means the repository is blocked.
        throw reason;
      }
      // Otherwise, we just ran out of rate limit
      return getRateLimitPromiseFromHeaders(headers);
    } else if (reason.statusCode == 404) {
      failedCount = 0;
      throw reason;
    } if (failedCount < 5) {
      console.log('Got bad code, retry #' + failedCount);
      return makeRequest(options);
    }
    console.log('Bad code', reason);
    throw new Error('Too many status errors, quiting');
  }

  function verifyRateLimits(response) {
    var rateLimitPromise = getRateLimitPromiseFromHeaders(response.headers);
    if (rateLimitPromise) return rateLimitPromise;
    var pageResults = JSON.parse(response.body);
    if (followNext) allPages.push(pageResults);

    var nextLink = followNext && getNextFormLink(response.headers.link);
    if (nextLink) {
      options.uri = nextLink;
      return makeRequest(options);
    }

    return followNext ? allPages : pageResults;
  }

  function getRateLimitPromiseFromHeaders(headers) {
    var rateLimit = parseRateLimit(headers);
    console.log('Rate limit: ' + rateLimit.limit + '/' + rateLimit.remaining);
    if (rateLimit.remaining === 0) {
      var waitTime = rateLimit.reset - new Date();
      if (waitTime < 0) {
        // This happens sometimes. Github caches rate limits?
        // Anyway, wait four seconds - it should clear.
        waitTime = 4000;
      }
      console.log('Rate limit exceeded, waiting before retry: ' + waitTime + 'ms');
      console.log('Current time is ' + (new Date()) + '; Reset: ' + (new Date(rateLimit.reset)));
      return P.delay(waitTime).then(resume);
    }
  }

  function resume() {
    return makeRequest(options);
  }
}

function parseRateLimit(headers) {
  var resetUTC = parseInt(headers['x-ratelimit-reset'], 10) * 1000;

  return {
    limit: parseInt(headers['x-ratelimit-limit'], 10),
    remaining: parseInt(headers['x-ratelimit-remaining'], 10),
    reset: resetUTC
  };
}

function getNextFormLink(link) {
  if (typeof link !== 'string') return;
  var linkMatch = link.match(/<(.+)>; rel="next"/);

  return linkMatch && linkMatch[1];
}
