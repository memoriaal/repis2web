#!/bin/bash

echo $(date -u --iso-8601=seconds) Started update
git pull
. ./repis_update.sh
