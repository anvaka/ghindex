# ghindex

Creates github index for similar repositories discovery. WIP

# Usage

To index repositories:

```
node repoIndexer.js --tokens="COMMA_SEPARATED_LIST_OF_GITHUB_TOKENS" > allrepo.json
```

This will save JSON stream of repositories with >= 200 stars into file `allrepo.json`.

If you think something does not go right, you can enable logging, by setting ENABLE_LOG
variable:

```
ENABLE_LOG=1 node repoIndexer.js --tokens=...
```

# Save to a database

After you've indexed repositories you can save them into a database. I'm using
leveldb as example, but any database would work.

```
node savetodb ./allrepo.json ./db/repositories
```

This will save repositories into folder /db, into `repositories` database

# license

MIT
