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
git add models
# git add node_modules/.cache/
git commit -m "Adding 'models' directory from 'master' branch."
git pull
git push --all

git checkout master