#!/bin/bash
source ./scripts_config

echo "Downloading watchers information from $WATCHERS_BUCKET"
gsutil cp $WATCHERS_BUCKET ./

echo "Extracting watchers information"
gunzip $WATCHERS_FILE
