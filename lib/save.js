var fs = require('fs');
var path = require('path');

module.exports = save;

function save(projectName, recommendation, OUTPUT_ROOT) {
  if (!OUTPUT_ROOT) OUTPUT_ROOT = 'out';

  console.log('Saving recommendation for', projectName);
  var pair = projectName.split('/');
  var user = pair[0];
  var repo = pair[1];
  var targetPath = path.join(OUTPUT_ROOT, user);
  var targetFile = path.join(targetPath, repo + '.json').toLowerCase();

  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath);
  }

  fs.writeFileSync(targetFile, JSON.stringify(recommendation));
  return projectName;
}
