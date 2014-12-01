#!/bin/bash
# This script will export data saved by `create_description_stream.sh`
# into gzipped CSV file in google storage

source ./scripts_config

echo "Exporting data from $DESCRIPTION_TABLE into $DESCRIPTION_BUCKET"

bq --project_id $PROJECT_ID \
  extract --compression=GZIP $DESCRIPTION_TABLE $DESCRIPTION_BUCKET
