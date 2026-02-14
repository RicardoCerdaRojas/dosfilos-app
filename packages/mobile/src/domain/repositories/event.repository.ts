import { Event } from '../models/event.model';

export interface EventRepository {
    getUpcomingEvents(churchId: string, limit?: number): Promise<Event[]>;
    getEventById(id: string): Promise<Event | null>;
    getPastEvents(churchId: string, limit?: number, offset?: number): Promise<Event[]>;
}
