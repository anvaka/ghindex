#!/bin/bash
# This script will export data saved by `create_watch_stream.sh`
# into gzipped CSV file in google storage

source ./scripts_config

echo "Exporting data from $WATCHERS_TABLE into $WATCHERS_BUCKET"

bq --project_id $PROJECT_ID \
  extract --compression=GZIP $WATCHERS_TABLE $WATCHERS_BUCKET
