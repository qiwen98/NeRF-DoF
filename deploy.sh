#!/usr/bin/env sh

set -e

npm run build

npm run deploy

## update master
git add -A
git commit -m 'New Deployment'


### update gh-pages
git checkout gh-pages
# git rm -r models
git checkout master -- models

# git add all
git add models
git add -A
git fetch --all
# git add node_modules/.cache/
git commit -m "Adding 'models' directory from 'master' branch."
git push --all

git checkout master