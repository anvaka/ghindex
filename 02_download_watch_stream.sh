#!/bin/bash
source ./scripts_config

echo "Downloading watchers information from $DESTINATION_BUCKET"
gsutil cp $DESTINATION_BUCKET ./

echo "Extracting watchers information"
gunzip $WATCHERS_FILE

# After gunzip we should remove '.gz' extension:
PLAIN_FILE=${WATCHERS_FILE/%.gz/}

echo "Removing 'https://github.com/' prefix from $PLAIN_FILE"
sed -i '' 's|https://github.com/||' $PLAIN_FILE
