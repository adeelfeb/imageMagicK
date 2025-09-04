#!/bin/bash

set -euo pipefail

template=$1
mask=$2
product=${3:-}

if [[ -n "$product" ]]; then
  out="maps/${product}/adjustment_map.jpg"
else
  out="maps/adjustment_map.jpg"
fi

convert "$template" \( -clone 0 -fill "#f1f1f1" -colorize 100 \) "$mask" -compose DivideSrc -composite "$out"