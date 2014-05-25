module.exports = function (remainingRepositories, resultsFileName, ghClient, indexed) {
  indexed = indexed || {};
  var totalIndexedSinceLastSave = 0;
  index(10000);

  function index(startFrom) {
    var repoName = remainingRepositories[startFrom].name;
    ghClient.findFollowers(repoName)
      .then(function (followers) {
        indexed[repoName] = followers;
        totalIndexedSinceLastSave += followers.length;
        if (totalIndexedSinceLastSave > 1000) {
          save();
        }

        if (remainingRepositories.length < startFrom) {
          save();
          console.log('Finished processing');
        } else {
          index(startFrom + 1);
        }
      });
  }

  function save() {
    var fs = require('fs');
    console.log('Saving current results to', resultsFileName);
    try {
      fs.writeFileSync(resultsFileName, JSON.stringify(indexed));
    } catch (e) {
      console.log("Error: ", e);
      throw e;

    }
    console.log('Added', totalIndexedSinceLastSave, 'followers info to the file');
    console.log('Remaining', remainingRepositories.length - Object.keys(indexed).length);
    totalIndexedSinceLastSave = 0;
  }
};
