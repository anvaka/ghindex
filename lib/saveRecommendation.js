module.exports = saveToFile;

var fs = require('fs');
var path = require('path');

function saveToFile(repoName, similarities) {
  console.log('Saving ' + repoName);
  var userRepo = repoName.split('/');
  var user = userRepo[0].toLowerCase();
  var repo = userRepo[1].toLowerCase();

  var targetPath = path.join('out', user);
  var targetFile = path.join(targetPath, repo + '.json');

  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath);
  }

  var recordsToWrite = similarities.slice(1, 100).map(shorten);
  fs.writeFileSync(targetFile, JSON.stringify(recordsToWrite));
}

function shorten(record) {
  // since we are serving from S3, want to minimize amount of data:
  return {
    n: record.full_name,
    r: record.jaccardIndex,
    d: record.description,
    f: record.forks_count,
    w: record.watchers_count
  };
}
