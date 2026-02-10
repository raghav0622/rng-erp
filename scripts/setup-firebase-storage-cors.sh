#!/bin/bash

# Script to set Firebase Storage CORS configuration
# Requires: Google Cloud SDK (gsutil)

BUCKET_NAME="rng-assoicates.firebasestorage.app"
CORS_FILE="firebase-storage-cors.json"

echo "Setting CORS configuration for Firebase Storage bucket: $BUCKET_NAME"

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "Error: gsutil is not installed."
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if CORS file exists
if [ ! -f "$CORS_FILE" ]; then
    echo "Error: $CORS_FILE not found"
    exit 1
fi

# Apply CORS configuration
echo "Applying CORS configuration..."
gsutil cors set "$CORS_FILE" "gs://$BUCKET_NAME"

if [ $? -eq 0 ]; then
    echo "✅ CORS configuration applied successfully!"
    echo ""
    echo "Verifying configuration..."
    gsutil cors get "gs://$BUCKET_NAME"
else
    echo "❌ Failed to apply CORS configuration"
    echo "Make sure you're authenticated: gcloud auth login"
    echo "And your project is set: gcloud config set project rng-assoicates"
    exit 1
fi
