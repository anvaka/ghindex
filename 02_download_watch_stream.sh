#!/bin/bash
source ./scripts_config

echo "Downloading watchers information from $DESTINATION_BUCKET"
gsutil cp $WATCHERS_BUCKET ./

echo "Extracting watchers information"
gunzip $WATCHERS_FILE

echo "Removing 'https://github.com/' prefix from $PLAIN_WATCHERS_FILE"
sed -i '' 's|https://github.com/||' $PLAIN_WATCHERS_FILE
