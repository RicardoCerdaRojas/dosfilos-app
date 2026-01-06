import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * Analytics Service
 * 
 * Centralized service for tracking user events via Cloud Functions.
 * All tracking is non-blocking and errors don't affect user experience.
 */
export class AnalyticsService {
    /**
     * Track a user activity event
     */
    static async trackEvent(
        eventType: 'page_view' | 'sermon_created' | 'sermon_edited' | 'feature_used' | 'export' | 'share',
        metadata?: Record<string, any>
    ): Promise<void> {
        try {
            const trackActivity = httpsCallable(functions, 'trackUserActivity');
            await trackActivity({
                eventType,
                metadata,
                sessionId: this.getSessionId(),
            });
        } catch (error) {
            // Silently fail - analytics shouldn't break user experience
            console.warn('[Analytics] Failed to track event:', eventType, error);
        }
    }

    /**
     * Track sermon creation
     */
    static async trackSermonCreated(sermonId: string, passage: string): Promise<void> {
        await this.trackEvent('sermon_created', {
            sermonId,
            passage,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Track sermon edit
     */
    static async trackSermonEdited(sermonId: string): Promise<void> {
        await this.trackEvent('sermon_edited', {
            sermonId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Track page view
     */
    static async trackPageView(pagePath: string): Promise<void> {
        await this.trackEvent('page_view', {
            page: pagePath,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Track feature usage
     */
    static async trackFeatureUsed(featureName: string, metadata?: Record<string, any>): Promise<void> {
        await this.trackEvent('feature_used', {
            feature: featureName,
            ...metadata,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Track export action
     */
    static async trackExport(format: string, sermonId?: string): Promise<void> {
        await this.trackEvent('export', {
            format,
            sermonId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Track share action
     */
    static async trackShare(sermonId: string): Promise<void> {
        await this.trackEvent('share', {
            sermonId,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * Get or create session ID
     * Session lasts for the browser session (tab close)
     */
    private static getSessionId(): string {
        let sessionId = sessionStorage.getItem('analytics_session_id');

        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            sessionStorage.setItem('analytics_session_id', sessionId);
        }

        return sessionId;
    }
}
