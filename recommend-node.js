/**
 * This script will run ot of memory very quickly. If you run it
 * make sure to use --max-old-heap-size=8192
 */
var fileName = process.argv[2] || './watchers.csv';
var recommend = require('./lib/recommend.js');
var save = require('./lib/save.js');

var OUTPUT_ROOT = 'out';

console.log('Loading watchers information from ' + fileName);
var load = require('./lib/load-watchers.js');
load(fileName, buildRecommendations);

function buildRecommendations(repos, users) {
  var total = repos.size;
  var processed = 0;
  repos.forEach(buildForRepository);

  function buildForRepository(followers, repositoryName) {
    processed += 1;
    console.log(processed + '/' + total + '. Analyzing ' + repositoryName + '...');
    if (followers.size < 50) {
      console.log(' > Skipping ' + repositoryName + ' - too little followers');
      return;
    }
    var related = recommend(repositoryName, repos, users).slice(0, 100);
    save(repositoryName, related, OUTPUT_ROOT);
  }
}
