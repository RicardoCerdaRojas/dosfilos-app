export interface ActivityEventDTO {
    type: 'page_view' | 'sermon_created' | 'sermon_edited' | 'feature_used' | 'export' | 'share';
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface TrackActivityCommand {
    userId: string;
    sessionId: string;
    event: ActivityEventDTO;
    deviceInfo?: {
        userAgent?: string;
        platform?: string;
        screenSize?: string;
    };
}

export interface IAnalyticsRepository {
    trackActivity(command: TrackActivityCommand): Promise<void>;
    updateUserAnalytics(userId: string, updates: Partial<UserAnalytics>): Promise<void>;
}

export interface UserAnalytics {
    lastActivityAt: Date;
    engagementScore: number;
    loginCount: number;
}

/**
 * Use Case: Track User Activity
 * 
 * Records user activity events and updates engagement metrics.
 * Called from frontend or cloud functions.
 */
export class TrackUserActivity {
    constructor(private analyticsRepository: IAnalyticsRepository) { }

    async execute(command: TrackActivityCommand): Promise<void> {
        // Record the activity event
        await this.analyticsRepository.trackActivity(command);

        // Update user analytics in real-time
        const analyticsUpdate: Partial<UserAnalytics> = {
            lastActivityAt: command.event.timestamp,
            // Engagement score calculation would happen in a Cloud Function
            // to avoid blocking the user experience
        };

        await this.analyticsRepository.updateUserAnalytics(
            command.userId,
            analyticsUpdate
        );
    }

    /**
     * Batch track multiple events at once
     * Useful for offline sync or bulk operations
     */
    async executeMany(commands: TrackActivityCommand[]): Promise<void> {
        // Process in parallel for better performance
        await Promise.all(
            commands.map(command => this.execute(command))
        );
    }

    /**
     * Track a simple event without full command structure
     */
    async trackSimpleEvent(
        userId: string,
        eventType: ActivityEventDTO['type'],
        metadata?: Record<string, any>
    ): Promise<void> {
        const command: TrackActivityCommand = {
            userId,
            sessionId: this.generateSessionId(),
            event: {
                type: eventType,
                timestamp: new Date(),
                metadata,
            },
        };

        await this.execute(command);
    }

    private generateSessionId(): string {
        // Generate a simple session ID (in production, this should come from the client)
        return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }
}
