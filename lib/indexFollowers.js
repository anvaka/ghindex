module.exports = function (remainingRepositories, resultsFileName, ghClient) {
  index(0);

  function index(startFrom) {
    ghClient.findFollowers(remainingRepositories[startFrom].name)
      .then(function (followers) {
        console.log(followers);
        // index (startfrom + 1);
      });
  }
};
