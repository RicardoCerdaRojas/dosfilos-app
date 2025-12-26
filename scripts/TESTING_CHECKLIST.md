# Analytics Testing Checklist

## Cloud Functions Status

### Greek Session Tracking ✅
- [x] onGreekSessionCreated - **WORKING** (user confirmed counter updated)
- [ ] onGreekSessionCompleted - Need to test
- [ ] onGreekSessionDeleted - Need to test

### Sermon Tracking
- [ ] onSermonCreated - Need to test (create new draft sermon)
- [ ] onSermonPublished - Need to test (publish a sermon)
- [ ] onSermonDeleted - Need to test (delete a sermon)

### User Lifecycle
- [ ] onUserCreated - Need to test (new user signup)
- [ ] onUserActivity - Need to test (login tracking)
- [ ] onUserDeleted - Need to test
- [ ] onSubscriptionChanged - Need to test (upgrade/downgrade)

## Known Issues Fixed
- ✅ Fixed Firestore path: global_metrics/daily → global_metrics_daily (8 instances)
- ✅ Fixed collection name: sermon_series → series
- ✅ Fixed field mapping: plans → series

## Testing Recommendations

### 1. Create New Sermon
Should increment:
- `user_analytics/{userId}.sermons.total`
- `user_analytics/{userId}.sermons.drafts`
- `global_metrics/aggregate.allTime.sermons`
- `global_metrics_daily/{today}.sermons.created`

### 2. Publish Sermon
Should:
- Decrement `sermons.drafts`
- Increment `sermons.published`

### 3. Complete Greek Session
Should increment:
- `user_analytics/{userId}.greekSessions.completed`

### 4. Change Plan (if applicable)
Should update:
- `global_metrics_daily/{today}.users.byPlan`
- `global_metrics_daily/{today}.users.paidUsers`

## Next Steps
1. Monitor logs for any errors
2. Test each trigger manually
3. Verify counters update correctly
