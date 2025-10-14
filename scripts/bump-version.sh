#!/bin/bash

# Safe, smart version bumping script with branch suffix and build metadata

set -e

# Parse command line arguments
DRY_RUN=false
COMMIT_TAG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --commit-tag)
      COMMIT_TAG="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--commit-tag <tag>]"
      echo "  --dry-run           Only output the next version, don't create git tag"
      echo "  --commit-tag <tag>  Create and push the specified git tag (used after successful build)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Define allowed branches and their suffixes
declare -A BRANCH_SUFFIX_MAP=(
  ["main"]=""
  ["develop"]="-develop"
  ["staging"]="-staging"
)

# Get current git branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Check if current branch is in the allowed list
if [[ -z "${BRANCH_SUFFIX_MAP[$CURRENT_BRANCH]}" && "$CURRENT_BRANCH" != "main" ]]; then
  echo "🚫 Not on a taggable branch. Skipping tag. Allowed branches: ${!BRANCH_SUFFIX_MAP[@]}"
  exit 0
fi

SUFFIX="${BRANCH_SUFFIX_MAP[$CURRENT_BRANCH]}"

# Get latest semver tag (excluding build metadata)
LATEST_TAG=$(git tag --list "v*" --sort=-version:refname | grep -Ev '\-build\.' | head -1)

if [ -z "$LATEST_TAG" ]; then
  if [ "$DRY_RUN" != true ]; then
    echo "No existing tags found. Starting at v0.1.0"
  fi
  BASE_VERSION="v0.1.0"
  TAG_COMMIT=""
else
  if [ "$DRY_RUN" != true ]; then
    echo "Latest tag: $LATEST_TAG"
  fi
  BASE_VERSION="${LATEST_TAG%%-*}" # Strip suffix like -develop or -staging
  TAG_COMMIT=$(git rev-list -n 1 "$LATEST_TAG")
fi

# Get current commit hash
CURRENT_COMMIT=$(git rev-parse HEAD)

# Strip 'v' prefix for version parsing
VERSION=${BASE_VERSION#v}

# Check if current commit matches latest tag
if [ "$CURRENT_COMMIT" == "$TAG_COMMIT" ]; then
  DATE=$(date +%Y%m%d)
  EXISTING_TAGS=$(git tag --list "${BASE_VERSION}${SUFFIX}-build.${DATE}.*")

  if [ -z "$EXISTING_TAGS" ]; then
    COUNT=0
  else
    COUNT=$(echo "$EXISTING_TAGS" | grep -c .)
  fi

  NEXT_BUILD_NUM=$((COUNT + 1))
  NEW_TAG="${BASE_VERSION}${SUFFIX}-build.${DATE}.${NEXT_BUILD_NUM}"

  if [ "$DRY_RUN" = true ]; then
    echo "$NEW_TAG"
    exit 0
  elif [ -n "$COMMIT_TAG" ]; then
    echo "🔁 Creating build metadata tag: $COMMIT_TAG"
    git tag "$COMMIT_TAG"
    git push origin "$COMMIT_TAG" 2>/dev/null || echo "⚠️ Warning: Could not push tag (may be running locally)"
    echo "✅ Tagged as: $COMMIT_TAG"
    exit 0
  else
    echo "🔁 Same commit as latest tag. Creating build metadata tag: $NEW_TAG"
    git tag "$NEW_TAG"
    git push origin "$NEW_TAG" 2>/dev/null || echo "⚠️ Warning: Could not push tag (may be running locally)"
    echo "✅ Tagged as: $NEW_TAG"
    exit 0
  fi
fi

# New commit: bump patch version
IFS='.' read -r MAJOR MINOR PATCH <<< "$VERSION"
PATCH=$((PATCH + 1))
NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}${SUFFIX}"

if [ "$DRY_RUN" = true ]; then
  echo "$NEW_TAG"
  exit 0
elif [ -n "$COMMIT_TAG" ]; then
  echo "🏷️ Creating new version tag: $COMMIT_TAG"
  git tag "$COMMIT_TAG"
  git push origin "$COMMIT_TAG" 2>/dev/null || echo "⚠️ Warning: Could not push tag (may be running locally)"
  echo "✅ Version bumped to: $COMMIT_TAG"
else
  echo "🏷️ New commit. Creating new version tag: $NEW_TAG"
  git tag "$NEW_TAG"
  git push origin "$NEW_TAG" 2>/dev/null || echo "⚠️ Warning: Could not push tag (may be running locally)"
  echo "✅ Version bumped to: $NEW_TAG"
fi
