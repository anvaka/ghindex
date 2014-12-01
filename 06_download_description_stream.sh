#!/bin/bash
source ./scripts_config

echo "Downloading projects description from $DESCRIPTION_BUCKET"
gsutil cp $DESCRIPTION_BUCKET ./

echo "Extracting watchers information"
gunzip $DESCRIPTION_FILE
