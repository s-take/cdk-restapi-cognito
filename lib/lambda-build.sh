#!/bin/bash

ASSET_DIR=/asset-output
npm i -g npm
cd lambda && npm i && npm exec tsc && cd ..
cp -rp lambda $ASSET_DIR
