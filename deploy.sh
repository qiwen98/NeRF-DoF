#!/usr/bin/env sh

set -e

npm i 
npm run build

npm run deploy

## update master
git add -A
git commit -m 'New Deployment'



### update gh-pages
git checkout gh-pages

git fetch --all
# git rm -r models
git checkout master -- models


##

# rebase
git rebase gh-pages

git add -A

git commit -m "Adding 'models' directory from 'master' branch."
git push -f -u origin gh-pages

git checkout master