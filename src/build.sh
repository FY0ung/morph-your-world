#!/usr/bin/env sh
# Bundles src/hero3d.js (+ three.js + the original character SVGs) into a single classic script
# so the prototype keeps working over file:// with no CDN. Only needed when src/hero3d.js changes.
#   npm i three@0.170.0 esbuild@0.24.0 && sh src/build.sh
cd "$(dirname "$0")/.." && npx esbuild src/hero3d.js --bundle --minify --format=iife --loader:.svg=text --outfile=hero3d.js
