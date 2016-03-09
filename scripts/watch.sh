#!/bin/bash
# Watches untransformed files for changes that affect the distribution/test

# Clean background processes after quit
trap "trap - SIGTERM && kill -- -$$" SIGINT SIGTERM EXIT

./scripts/make-mini-d3.sh # TODO: remove

mkdir -p dist  # in case it doesn't exist; watchify needs it

# Start watchers
watchify -v --poll -t [ babelify --ignore src/lib ] src/main/pileup.js      --debug -o dist/pileup.js --standalone pileup &

# Wait until background processes end
wait
