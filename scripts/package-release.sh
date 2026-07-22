#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${1:-1.1.0}"
tag="v${version}"
output_dir="${repo_root}/dist"
archive="${output_dir}/aipilot-${version}.zip"

if [[ ! "${version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must use MAJOR.MINOR.PATCH format." >&2
  exit 1
fi

node "${repo_root}/scripts/release-check.js"
git -C "${repo_root}" rev-parse --verify --quiet "refs/tags/${tag}" >/dev/null || {
  echo "Missing release tag ${tag}. Create it after merging the release into main." >&2
  exit 1
}

mkdir -p "${output_dir}"
git -C "${repo_root}" archive \
  --format=zip \
  --prefix="aipilot-${version}/" \
  --output="${archive}" \
  "${tag}"

(
  cd "${output_dir}"
  shasum -a 256 "$(basename "${archive}")" >"$(basename "${archive}").sha256"
)

echo "Created ${archive}"
echo "Created ${archive}.sha256"
