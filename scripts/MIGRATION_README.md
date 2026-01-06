# Migration Script - Event-Driven Analytics

## Overview
This script migrates existing data to the new event-driven analytics system by populating:
- `user_analytics/{userId}` documents for all existing users
- `global_metrics/aggregate` document with platform-wide totals

## Prerequisites
1. Firebase Admin SDK initialized with application default credentials
2. Proper Firebase authentication (GOOGLE_APPLICATION_CREDENTIALS env var)

## Running the Migration

```bash
node scripts/migrateToEventDriven.js
```

The script uses Firebase Admin SDK with application default credentials (same pattern as your other scripts).

## What the Script Does

### Step 1: Fetch all users
- Retrieves all documents from `users` collection

### Step 2: Migrate user analytics
For each user, the script:
- **Sermons**: Counts sermons with `wizardProgress` field
  - Total count
  - Published count (have `publishedCopyId`)
  - Draft count (no `publishedCopyId`)
  - Last created timestamp
  
- **Greek Sessions**: Counts documents in `greek_sessions`
  - Total count
  - Completed count (status === 'ACTIVE')
  - Last session timestamp

- **Series**: Counts documents in `sermon_series`
- **Preaching Plans**: Counts documents in `preaching_plans`
- **Logins**: Counts activities in `user_activities` where type === 'login'

- **Last 30 Days**: Calculates metrics for recent activity

### Step 3: Calculate global aggregates
Sums up all user metrics to create platform-wide totals

### Step 4: Write to Firestore
- Writes `user_analytics/{userId}` for each user
- Writes `global_metrics/aggregate` document

### Step 5: Validation
Verifies that:
- All users have corresponding `user_analytics` documents
- `global_metrics/aggregate` document exists

## Output Example
```
🚀 Starting Event-Driven Analytics Migration...

📊 Step 1: Fetching all users...
Found 10 users

📊 Step 2: Migrating user analytics...
  Processing user: user123
    ✓ Sermons: 15 (13 published, 2 drafts)
    ✓ Greek Sessions: 24 (24 completed)
    ✓ Series: 2
    ✓ Plans: 1
    ✓ Logins: 335

✓ User analytics migration complete: 10 successful, 0 errors

📊 Step 3: Calculating global aggregates...
  Total Users: 10
  Total Sermons: 58
  Total Greek Sessions: 24

📊 Step 4: Writing global aggregate...
✓ Global aggregate created

📊 Step 5: Validation...
  user_analytics documents: 10/10
  global aggregate exists: true

✅ Migration completed successfully!
```

## Safety Features
- **Idempotent**: Can be run multiple times safely (overwrites existing data)
- **Error Handling**: Catches and logs errors per user, continues with others
- **Validation**: Verifies data was written correctly before completing
- **Detailed Logging**: Shows progress and statistics

## After Migration
1. Deploy Cloud Functions to start tracking new events  
2. Test by creating a new sermon and verifying analytics update
3. Monitor Cloud Function logs for any issues
4. Update frontend to read from new collections

## Rollback
If needed, you can delete the collections in Firebase Console or run:
```javascript
db.collection('user_analytics').listDocuments().then(docs => {
  return Promise.all(docs.map(doc => doc.delete()));
});
db.doc('global_metrics/aggregate').delete();
```
