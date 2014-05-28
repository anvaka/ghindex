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
node followersIndex.js allRepo.json --tokens="COMMA_SEPARATED_LIST_OF_GITHUB_TOKENS"
```

This will create a new file `allRepoFollowers.json` which will contain all popular
repositories from `allrepo.json` along with users who gave them a star.

Note: currently it just dumps records to a file. From my experience 12k repositories
matchin 110MB, which is not really good. Better approach would be to save indexed
users into levelbd database as it discovers followers

# Save to a database

After you've indexed repositories you can save them into a database. I'm using
leveldb as example, but any database would work.

```
node savetodb ./allRepoFollowers.json ./db/followers
```

This will save followers into folder /db, into `followers` database

# license

MIT
