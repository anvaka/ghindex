#!/bin/bash
source ./scripts_config

echo "Downloading watchers information from $DESTINATION_BUCKET"
gsutil cp $DESTINATION_BUCKET ./

echo "Extracting watchers information"
gunzip $WATCHERS_FILE
