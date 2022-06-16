#!/usr/bin/env sh

set -e

npm run build

npm run deploy

git checkout gh-pages
$ git checkout master -- models
$ git add models
$ git add node_modules/.cache/
$ git commit -m "Adding 'models' directory from 'master' branch."
$ git push --all

$ git checkout master