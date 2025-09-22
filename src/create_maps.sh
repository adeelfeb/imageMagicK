#!/bin/bash

# Dynamic map generation for multiple base images using the original per-map scripts
# Usage:
#   ./create_maps.sh                # generate maps for all products under base_images/*/
#   ./create_maps.sh <product_name> # generate maps only for that product

set -euo pipefail

BASE_IMAGES_DIR="base_images"

generate_for_product() {
  local product="$1"
  local base_dir="${BASE_IMAGES_DIR}/${product}"
  local template="${base_dir}/template.jpg"
  local mask="${base_dir}/mask.png"

  if [[ ! -f "$template" || ! -f "$mask" ]]; then
    echo "Warning: Missing template/mask for '$product' — skipping"
    return 1
  fi

  mkdir -p "maps/${product}" "mpcs/${product}"

  echo "Generating maps for: $product"
  # Call original scripts but direct outputs into per-product subfolders via third arg
  bash src/lighting_map.sh "$template" "$mask" "$product"
  bash src/displacement_map.sh "$template" "$mask" "$product"
  bash src/adjustment_map.sh "$template" "$mask" "$product"
  echo "Done: $product"
}

if [[ $# -eq 1 ]]; then
  generate_for_product "$1"
else
  echo "Generating maps for all products under ${BASE_IMAGES_DIR}..."
  for dir in ${BASE_IMAGES_DIR}/*/; do
    [[ -d "$dir" ]] || continue
    product="$(basename "$dir")"
    generate_for_product "$product" || true
  done
  echo "All products processed."
fi