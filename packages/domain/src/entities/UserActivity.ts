/**
 * Device information captured during user activity
 */
export interface DeviceInfo {
    platform: string; // 'web', 'ios', 'android'
    browser?: string; // 'chrome', 'safari', 'firefox', etc.
    screenResolution?: string; // '1920x1080'
    userAgent?: string;
}

/**
 * Individual activity event within a session
 */
export interface ActivityEvent {
    type: 'page_view' | 'action' | 'feature_use' | 'error';
    name: string; // e.g., 'sermon_created', 'greek_tutor_started'
    timestamp: Date;
    metadata?: Record<string, any>;
}

/**
 * User activity session entity
 * Tracks individual user sessions and their events
 */
export interface UserActivity {
    id: string;
    userId: string;

    // Session info
    sessionId: string;
    startTime: Date;
    endTime?: Date;
    duration?: number; // in minutes

    // Activity details
    events: ActivityEvent[];

    // Context
    deviceInfo: DeviceInfo;

    // Computed fields
    pagesVisited: string[];
    actionsPerformed: string[];

    createdAt: Date;
}

/**
 * User activity entity class with factory method
 */
export class UserActivityEntity implements UserActivity {
    constructor(
        public id: string,
        public userId: string,
        public sessionId: string,
        public startTime: Date,
        public events: ActivityEvent[],
        public deviceInfo: DeviceInfo,
        public pagesVisited: string[],
        public actionsPerformed: string[],
        public createdAt: Date = new Date(),
        public endTime?: Date,
        public duration?: number
    ) { }

    static create(data: Omit<UserActivity, 'id' | 'createdAt'> & { id?: string }): UserActivityEntity {
        return new UserActivityEntity(
            data.id || crypto.randomUUID(),
            data.userId,
            data.sessionId,
            data.startTime,
            data.events,
            data.deviceInfo,
            data.pagesVisited,
            data.actionsPerformed,
            new Date(),
            data.endTime,
            data.duration
        );
    }

    /**
     * End the session and calculate duration
     */
    endSession(): UserActivityEntity {
        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - this.startTime.getTime()) / 1000 / 60); // minutes

        return new UserActivityEntity(
            this.id,
            this.userId,
            this.sessionId,
            this.startTime,
            this.events,
            this.deviceInfo,
            this.pagesVisited,
            this.actionsPerformed,
            this.createdAt,
            endTime,
            duration
        );
    }

    /**
     * Add an event to the session
     */
    addEvent(event: ActivityEvent): UserActivityEntity {
        const events = [...this.events, event];
        const pagesVisited = event.type === 'page_view'
            ? [...new Set([...this.pagesVisited, event.name])]
            : this.pagesVisited;
        const actionsPerformed = event.type === 'action'
            ? [...new Set([...this.actionsPerformed, event.name])]
            : this.actionsPerformed;

        return new UserActivityEntity(
            this.id,
            this.userId,
            this.sessionId,
            this.startTime,
            events,
            this.deviceInfo,
            pagesVisited,
            actionsPerformed,
            this.createdAt,
            this.endTime,
            this.duration
        );
    }
}
