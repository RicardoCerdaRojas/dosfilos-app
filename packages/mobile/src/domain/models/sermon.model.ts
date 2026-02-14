export interface Sermon {
    id: string;
    title: string;
    description?: string;
    videoUrl?: string; // YouTube/Vimeo URL
    thumbnailUrl?: string;
    duration?: number; // seconds
    preacher?: string;
    passage?: string;
    status: 'Draft' | 'Working' | 'Ready' | 'Preached';
    date: Date;
    seriesId?: string;
    tags?: string[];
    createdAt: Date;
    updatedAt: Date;
}
