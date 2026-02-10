# PowerShell script to set Firebase Storage CORS configuration
# Requires: Google Cloud SDK (gsutil)

$BUCKET_NAME = "rng-assoicates.firebasestorage.app"
$CORS_FILE = "firebase-storage-cors.json"

Write-Host "Setting CORS configuration for Firebase Storage bucket: $BUCKET_NAME" -ForegroundColor Cyan

# Check if gsutil is installed
$gsutilPath = Get-Command gsutil -ErrorAction SilentlyContinue
if (-not $gsutilPath) {
    Write-Host "Error: gsutil is not installed." -ForegroundColor Red
    Write-Host "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Check if CORS file exists
if (-not (Test-Path $CORS_FILE)) {
    Write-Host "Error: $CORS_FILE not found" -ForegroundColor Red
    exit 1
}

# Apply CORS configuration
Write-Host "Applying CORS configuration..." -ForegroundColor Yellow
& gsutil cors set $CORS_FILE "gs://$BUCKET_NAME"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ CORS configuration applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifying configuration..." -ForegroundColor Yellow
    & gsutil cors get "gs://$BUCKET_NAME"
} else {
    Write-Host "❌ Failed to apply CORS configuration" -ForegroundColor Red
    Write-Host "Make sure you're authenticated: gcloud auth login" -ForegroundColor Yellow
    Write-Host "And your project is set: gcloud config set project rng-assoicates" -ForegroundColor Yellow
    exit 1
}
