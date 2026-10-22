#!/usr/bin/env bash
set -euo pipefail

# Crewloom Bridge Release Automator
# Usage: ./scripts/release.sh [patch|minor|major|<specific_version>]

TARGET_BUMP="${1:-patch}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🔍 Validating Git status in $PROJECT_DIR..."
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
  echo "⚠️ Warning: You are on branch '$CURRENT_BRANCH', not main."
fi

# Run build & verification
echo "📦 Running build..."
npm run build

# Bump version in package.json
OLD_VERSION="$(node -p "require('./package.json').version")"
npm version "$TARGET_BUMP" --no-git-tag-version
NEW_VERSION="$(node -p "require('./package.json').version")"
TAG_NAME="v$NEW_VERSION"

echo "🚀 Bumping version: $OLD_VERSION -> $NEW_VERSION (Tag: $TAG_NAME)"

# Stage & commit
git add package.json package-lock.json dist/ CHANGELOG.md 2>/dev/null || git add package.json package-lock.json dist/
git commit -m "chore(release): $TAG_NAME" || true

# Create annotated tag
git tag -a "$TAG_NAME" -m "Release $TAG_NAME - Crewloom Bridge"

# Push to origin
echo "⬆️ Pushing commit and tags to origin..."
git push origin "$CURRENT_BRANCH" --tags

# GitHub Release via gh CLI
if command -v gh >/dev/null 2>&1; then
  echo "📢 Publishing GitHub Release for $TAG_NAME..."
  gh release create "$TAG_NAME" \
    --title "Crewloom Bridge $TAG_NAME" \
    --generate-notes \
    --repo crewloom/bridge || echo "⚠️ GitHub release create failed or already exists"
fi

echo "✅ Successfully released $TAG_NAME!"
