#!/usr/bin/env bash
set -euo pipefail

# Crewloom Bridge Release Automator
# Usage: ./scripts/release.sh [patch|minor|major|<specific_version>]

TARGET_BUMP="${1:-patch}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🔍 Validating Git status in $PROJECT_DIR..."
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" == HEAD || -n "$(git status --porcelain)" ]]; then
  echo "Release requires a branch with a clean working tree and index." >&2
  exit 1
fi
command -v gh >/dev/null

# Run build & verification
echo "📦 Running build..."
npm run build
npx tsc --noEmit
npm test

# Bump version in package.json
OLD_VERSION="$(node -p "require('./package.json').version")"
npm version "$TARGET_BUMP" --no-git-tag-version
NEW_VERSION="$(node -p "require('./package.json').version")"
TAG_NAME="v$NEW_VERSION"

echo "🚀 Bumping version: $OLD_VERSION -> $NEW_VERSION (Tag: $TAG_NAME)"

# Stage & commit
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): $TAG_NAME"

# Create annotated tag
git tag -a "$TAG_NAME" -m "Release $TAG_NAME - Crewloom Bridge"

# Push to origin
echo "⬆️ Pushing commit and tags to origin..."
git push origin "HEAD:refs/heads/$CURRENT_BRANCH" "refs/tags/$TAG_NAME"

# GitHub Release via gh CLI
gh release create "$TAG_NAME" --verify-tag \
  --title "Crewloom Bridge $TAG_NAME" --generate-notes

echo "✅ Successfully released $TAG_NAME!"
