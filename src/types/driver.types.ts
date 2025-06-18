/**
 * Types pour les drivers de transport
 */

export interface HttpRequest {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    data?: any;
    headers?: Record<string, string>;
    timeout?: number;
}

export interface HttpResponse {
    status: number;
    statusText: string;
    data: any;
    headers: Record<string, string>;
}

export interface EmailMessage {
    to: string | string[];
    from: string;
    subject: string;
    text?: string;
    html?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}

export interface SmtpResponse {
    messageId: string;
    accepted: string[];
    rejected: string[];
    pending: string[];
    envelope: {
        from: string;
        to: string[];
    };
}

export interface SmtpDriverConfig {
    host: string;
    port: number;
    secure?: boolean;
    auth?: {
        user: string;
        pass: string;
    };
    pool?: boolean;
    maxConnections?: number;
    maxMessages?: number;
    timeout?: number;
}

export interface HttpDriverConfig {
    baseURL?: string;
    timeout?: number;
    headers?: Record<string, string>;
    maxRedirects?: number;
    retryAttempts?: number;
    retryDelay?: number;
}