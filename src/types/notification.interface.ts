export interface NotificationPayload {
    [key: string]: any;
}

export interface NotificationContext {
    eventType: string;
    correlationId: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface NotificationTemplate {
    id: string;
    name: string;
    content: string;
    variables: string[];
    language?: string;
    version?: number;
}
