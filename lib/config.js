module.exports = config();

function config() {
  var argv = require('optimist')
           .usage('Makes an index of popular repositories\nUsage: $0')
           .describe('tokens', 'Comma separated list of github tokens')
           .argv;

  if (typeof argv.tokens === 'string') {
    argv.tokens = argv.tokens.replace(/\s/g, '').split(',');
  }

  var api = {};
  for (var key in argv) {
    if (argv.hasOwnProperty(key)) {
      api[key] = argv[key];
    }
  }

  if (!api.tokens) {
    api.tokens = [];
  }

  return api;
}
