# Firebase Storage CORS Configuration

This guide explains how to configure CORS for Firebase Storage to allow image editing in the browser.

## Why This Is Needed

When editing images loaded from Firebase Storage URLs, the browser needs to:
1. Fetch the image via `fetch()` API
2. Load the image into a canvas element
3. Export the canvas as a blob

All of these operations require proper CORS headers from Firebase Storage.

## Method 1: Using gsutil (Recommended)

### Prerequisites

1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Authenticate: `gcloud auth login`
3. Set your project: `gcloud config set project rng-assoicates` (or your project ID)

### Steps

1. **Get your storage bucket name** from Firebase Console:
   - Go to Firebase Console → Storage
   - Your bucket name is shown (e.g., `rng-assoicates.firebasestorage.app`)

2. **Apply CORS configuration**:
   ```bash
   gsutil cors set firebase-storage-cors.json gs://rng-assoicates.firebasestorage.app
   ```

   Replace `rng-assoicates.firebasestorage.app` with your actual bucket name.

3. **Verify CORS is set**:
   ```bash
   gsutil cors get gs://rng-assoicates.firebasestorage.app
   ```

## Method 2: Using Firebase Console (Alternative)

Firebase Console doesn't directly support CORS configuration, but you can:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **Cloud Storage** → **Buckets**
4. Click on your Firebase Storage bucket
5. Go to **Configuration** tab
6. Scroll to **CORS configuration**
7. Click **Edit CORS configuration**
8. Paste the contents of `firebase-storage-cors.json`
9. Save

## Method 3: Using Firebase CLI (If Available)

```bash
firebase storage:cors:set firebase-storage-cors.json
```

Note: This command may not be available in all Firebase CLI versions.

## Verification

After setting CORS, test by:

1. Opening your app in the browser
2. Going to Profile page
3. Clicking on an existing profile image
4. The edit modal should now load the image successfully

## Troubleshooting

- **Still getting CORS errors?** Wait a few minutes - CORS changes can take time to propagate
- **Bucket name not found?** Check Firebase Console → Storage for the exact bucket name
- **gsutil not found?** Make sure Google Cloud SDK is installed and in your PATH

## Security Note

The current CORS configuration allows all origins (`"origin": ["*"]`). For production, you may want to restrict this to your specific domains:

```json
[
  {
    "origin": [
      "https://rng-erp.vercel.app",
      "https://yourdomain.com",
      "http://localhost:3000"
    ],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "x-goog-resumable"
    ],
    "maxAgeSeconds": 3600
  }
]
```
