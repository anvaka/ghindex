var tokens = require('./lib/tokens')();

if (tokens.enabled > 0) {
  require('./lib/ghclient')(tokens).findRepositories('stars:>=60000')
    .on('data', function (repository) {
      console.log(repository);
    });
} else {
  printTokenHelp();
}

function printTokenHelp() {
  [
    'Github access token is not present in environment variables',
    'Go to https://github.com/settings/applications and click "Create new token"',
    'Pass tokens as a comma-separated argument --tokens="A,B,C"'
  ].forEach(function (line) { console.log(line); });
}
