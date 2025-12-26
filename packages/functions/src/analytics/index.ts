// Export existing analytics functions
export { aggregateDailyMetrics } from './aggregateDailyMetrics';
export { onUserLogin } from './onUserLogin';
export { trackUserActivity } from './trackUserActivity';

// Export new event-driven analytics functions
export {
    onSermonCreated,
    onSermonPublished,
    onSermonDeleted,
} from './sermonAnalytics';

export {
    onGreekSessionCreated,
    onGreekSessionCompleted,
    onGreekSessionDeleted,
} from './greekSessionAnalytics';

export {
    onUserCreated,
    onUserActivity,
    onUserDeleted,
} from './userAnalytics';
