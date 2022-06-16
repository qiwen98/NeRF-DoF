#!/usr/bin/env sh

set -e

npm run build

npm run deploy

git checkout gh-pages
$ git checkout master -- models
$ git add models
$ git commit -m "Adding 'models' directory from 'master' branch."