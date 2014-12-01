#!/bin/bash
# This script will export data saved by `create_watch_stream.sh`
# into gzipped CSV file in google storage

source ./scripts_config

echo "Exporting data from $DESTINATION_TABLE into $DESTINATION_BUCKET"

bq --project_id $PROJECT_ID \
  extract --compression=GZIP $DESTINATION_TABLE $DESTINATION_BUCKET
