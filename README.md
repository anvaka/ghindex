# ghindex

Creates github index for similar repositories discovery. WIP

# Usage

## Gatehring popular repositories 

To index popular repositories (> 200 stars):

```
node repoIndexer.js --tokens="COMMA_SEPARATED_LIST_OF_GITHUB_TOKENS" > allrepo.json
```

This will save JSON stream of repositories with >= 200 stars into file `allrepo.json`.

If you think something does not go right, you can enable logging, by setting ENABLE_LOG
variable:

```
ENABLE_LOG=1 node repoIndexer.js --tokens=...
```

## Gathering followers for repositories

Second step to building index of recommendations is to gather followers of popular
repositories. To do so run:

```
node followersIndex.js allRepo.json ./db/followers --tokens="COMMA_SEPARATED_LIST_OF_GITHUB_TOKENS"
```

This will create a new leveldb database `followers` inside `db` folder. The database
will include all repositories from `allrepo.json` along with users who gave them a star.

## TODO: Stargazers index

Last indexing step is to collect all repositories which are starred by found users.

# license

MIT
