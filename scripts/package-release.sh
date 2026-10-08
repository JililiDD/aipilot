#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${1:-$(cd "${repo_root}" && node -p "require('./.claude-plugin/plugin.json').version")}"
tag="v${version}"
output_dir="${repo_root}/dist"
archive="${output_dir}/aipilot-${version}.zip"

if [[ ! "${version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Version must use MAJOR.MINOR.PATCH format." >&2
  exit 1
fi

node "${repo_root}/scripts/release-check.js" "${version}"
git -C "${repo_root}" rev-parse --verify --quiet "refs/tags/${tag}" >/dev/null || {
  echo "Missing release tag ${tag}. Create it after merging the release into main." >&2
  exit 1
}

# The checks above ran on the working tree, so it must be exactly the tagged tree that gets archived.
if [[ "$(git -C "${repo_root}" rev-parse HEAD)" != "$(git -C "${repo_root}" rev-parse "${tag}^{commit}")" ]] \
  || [[ -n "$(git -C "${repo_root}" status --porcelain)" ]]; then
  echo "Check out ${tag} with a clean working tree before packaging; the release checks ran on the working tree." >&2
  exit 1
fi

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
