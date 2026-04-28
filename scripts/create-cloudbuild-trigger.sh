#!/usr/bin/env bash
set -euo pipefail

# Usage:
# PROJECT_ID=ant-go \
# REGION=asia-southeast1 \
# CONNECTION=github-connection \
# REPOSITORY=ant-go \
# BRANCH_REGEX='^main$' \
# TRIGGER_NAME='ant-go-appengine-main' \
# ./scripts/create-cloudbuild-trigger.sh

: "${PROJECT_ID:?Missing PROJECT_ID}"
: "${REGION:?Missing REGION}"
: "${CONNECTION:?Missing CONNECTION}"
: "${REPOSITORY:?Missing REPOSITORY}"

BRANCH_REGEX="${BRANCH_REGEX:-^main$}"
TRIGGER_NAME="${TRIGGER_NAME:-ant-go-appengine-main}"

# Ensure Cloud Build can read the secret used in cloudbuild.appengine.yaml.
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
gcloud secrets add-iam-policy-binding FIREBASE_ADMIN_CREDENTIALS_JSON \
  --project="$PROJECT_ID" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" >/dev/null

# Validate that the connection exists before creating trigger.
gcloud builds connections describe "$CONNECTION" \
  --project="$PROJECT_ID" \
  --region="$REGION" >/dev/null

# Create a repository trigger that deploys App Engine when branch matches BRANCH_REGEX.
REPOSITORY_RESOURCE="projects/${PROJECT_ID}/locations/${REGION}/connections/${CONNECTION}/repositories/${REPOSITORY}"
gcloud builds triggers create repository \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --name="$TRIGGER_NAME" \
  --repository="$REPOSITORY_RESOURCE" \
  --branch-pattern="$BRANCH_REGEX" \
  --build-config="cloudbuild.appengine.yaml"

echo "Created trigger: $TRIGGER_NAME"


