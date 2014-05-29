module.exports = function (remainingRepositories, db, ghClient, indexed) {
  var totalIndexed = 0;
  index(11000).then(function () {
    console.log('Finished indexing popular repositories followers');
  });

  function index(startFrom) {
    var repoName = remainingRepositories[startFrom].name;
    console.log('Indexing ', repoName);
    return ghClient.findFollowers(repoName)
      .then(function (followers) {
        console.log('Found', followers.length, 'followers');
        return db.save(repoName, followers);
      }).then(function () {
        totalIndexed++;
        console.log('Remaining repositories:', remainingRepositories.length - totalIndexed);
        if (remainingRepositories.length < startFrom) {
          return db.flush(); // we are done here.
        }
        return index(startFrom + 1);
      });
  }
};
