# Firestore Deployment Quick Guide

## 📋 Prerequisites

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project (if not already done)
firebase init firestore
```

## 🚀 Deploy Indexes Only

```bash
# Deploy only the composite indexes
firebase deploy --only firestore:indexes

# Expected output:
# ✓ Deploy complete!
# Indexes will build in background (check Firebase Console)
```

## 📊 Check Index Status

1. **Firebase Console:**
   - Go to https://console.firebase.google.com
   - Select your project
   - Navigate to **Firestore Database** → **Indexes**
   - Wait until all indexes show **"Enabled"** status

2. **Command Line:**
   ```bash
   firebase firestore:indexes
   ```

## 🔐 Deploy Security Rules

```bash
# Deploy only the security rules
firebase deploy --only firestore:rules

# Test rules locally with emulator
firebase emulators:start --only firestore
```

## 🎯 Deploy Everything

```bash
# Deploy both indexes and rules
firebase deploy --only firestore

# Deploy entire Firebase configuration
firebase deploy
```

## ⏱️ Index Build Time

- **Small collections (<1000 docs):** 1-5 minutes
- **Medium collections (1000-10000 docs):** 5-15 minutes
- **Large collections (>10000 docs):** 15-60+ minutes

**Note:** Queries will fail until indexes are fully built.

## 🧪 Test Indexes Locally

```bash
# Start emulator with indexes
firebase emulators:start

# Emulator automatically reads firestore.indexes.json
# Test your queries in dev environment
npm run dev
```

## 📝 Files Created

- **`firestore.indexes.json`** - Composite index definitions
- **`firestore.rules`** - Security rules
- **`firebase.json`** - Firebase project configuration
- **`FIRESTORE_INDEXES_ANALYSIS.md`** - Detailed documentation

## ⚠️ Common Issues

### Issue: "Index already exists"

**Solution:** Indexes are already deployed. Safe to ignore.

### Issue: Query still slow after deployment

**Causes:**

1. Index still building (check console)
2. Query doesn't match index exactly
3. Need additional index for that query pattern

### Issue: "FAILED_PRECONDITION: The query requires an index"

**Solution:**

1. Click the link in error message (creates index automatically)
2. Or add the index to `firestore.indexes.json` manually
3. Deploy: `firebase deploy --only firestore:indexes`

## 📈 Performance Expectations

### Before Indexes (Current State)

```
GET /dashboard/user-management/health 200 in 2.5min
GET /dashboard/user-management/orphaned-cleanup 200 in 2.3min
```

### After Indexes (Expected)

```
GET /dashboard/user-management/health 200 in <3s
GET /dashboard/user-management/orphaned-cleanup 200 in <2s
```

**Navigation between pages: <500ms** (with React Query cache)

## 🔄 Updating Indexes

When adding new queries to code:

1. **Identify new query pattern:**

   ```typescript
   // Example: New search by photoURL + deletedAt
   await repo.find({
     where: [
       ['photoURL', '!=', null],
       ['deletedAt', '==', null],
     ],
   });
   ```

2. **Add index to firestore.indexes.json:**

   ```json
   {
     "collectionGroup": "app-users",
     "queryScope": "COLLECTION",
     "fields": [
       { "fieldPath": "photoURL", "order": "ASCENDING" },
       { "fieldPath": "deletedAt", "order": "ASCENDING" }
     ]
   }
   ```

3. **Deploy:**
   ```bash
   firebase deploy --only firestore:indexes
   ```

## 📚 Next Steps

1. ✅ Review `FIRESTORE_INDEXES_ANALYSIS.md` for detailed analysis
2. ✅ Deploy indexes: `firebase deploy --only firestore:indexes`
3. ✅ Deploy rules: `firebase deploy --only firestore:rules`
4. ✅ Wait for indexes to build (check console)
5. ✅ Test navigation performance
6. ✅ Monitor for any "index required" errors

## 💡 Pro Tips

- **Always deploy to staging first** before production
- **Use emulator for local development** to catch index issues early
- **Monitor Firebase Console** for index build progress
- **Set up alerting** for query performance degradation
- **Review indexes quarterly** to remove unused ones

---

**Need help?** Check `FIRESTORE_INDEXES_ANALYSIS.md` for full documentation.
