# ghindex

Creates github index for similar repositories discovery. WIP

# Usage

To index repositories:

```
node repoIndexer.js --tokens="COMMA_SEPARATED_LIST_OF_GITHUB_TOKENS"
```

This will print JSON stream of repositories with >= 200 stars. You may want to
save the output into a file.

If you think something does not go right, you can enable logging, by setting ENABLE_LOG
variable:

```
ENABLE_LOG=1 node repoIndexer.js --tokens=...
```

# license

MIT
