import { ReactNode } from 'react';

export type ContentType = 'exegesis' | 'homiletics' | 'sermon';

export interface QuickAction {
    id: string;
    label: string;
    icon?: string;
    description?: string;
}

export interface CanvasChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    appliedChange?: boolean;
}

export interface ContentAdapter<T> {
    render(content: T): ReactNode;
    serialize(content: T): string;
    deserialize(data: string): T;
    getQuickActions(selection?: string): QuickAction[];
}

export interface CanvasChatProps<T = any> {
    content: T;
    contentType: ContentType;
    onContentUpdate: (content: T) => void;
    contextData?: Record<string, any>;
}
