export interface Event {
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    startDate: Date;
    endDate?: Date;
    location?: string;
    address?: string;
    isOnline?: boolean;
    registrationUrl?: string;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
}
