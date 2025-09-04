#!/bin/bash

set -euo pipefail

template=$1
mask=$2
product=${3:-}

if [[ -n "$product" ]]; then
  normalized_template_map_tmp="mpcs/${product}/normalized_template_map_tmp.mpc"
  generate_displacement_map_tmp="mpcs/${product}/generate_displacement_map_tmp.mpc"
  displacement_map="maps/${product}/displacement_map.png"
  mkdir -p "mpcs/${product}" "maps/${product}"
else
  normalized_template_map_tmp='mpcs/normalized_template_map_tmp.mpc'
  generate_displacement_map_tmp='mpcs/generate_displacement_map_tmp.mpc'
  displacement_map='maps/displacement_map.png'
fi

# Apply mask
convert "$template" "$mask" -alpha off -colorspace gray -compose CopyOpacity -composite "$normalized_template_map_tmp"

brightness_delta=30
convert "$normalized_template_map_tmp" -evaluate subtract $brightness_delta% -background grey50 -alpha remove -alpha off "$generate_displacement_map_tmp"
convert "$generate_displacement_map_tmp" -blur 0x10 "$displacement_map"
# convert $normalized_template_map_tmp -blur 0x10 $displacement_map