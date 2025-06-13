import { EventTypesConfig } from '@afidos/nestjs-event-notifications';

export const systemEvents: EventTypesConfig = {
    'system.maintenance.scheduled': {
        description: 'Scheduled maintenance notification',
        schema: {
            maintenanceId: { type: 'string', required: true },
            title: { type: 'string', required: true },
            description: { type: 'string', required: true },
            scheduledStart: { type: 'date', required: true },
            scheduledEnd: { type: 'date', required: true },
            affectedServices: { type: 'array', required: true },
            severity: { type: 'string', required: true },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['email', 'slack', 'webhook'],
        templates: {
            email: 'maintenance-notification',
            slack: 'maintenance-alert',
        },
        priority: 'normal',
    },

    'system.error.critical': {
        description: 'Critical system error occurred',
        schema: {
            errorId: { type: 'string', required: true },
            service: { type: 'string', required: true },
            errorType: { type: 'string', required: true },
            message: { type: 'string', required: true },
            stackTrace: { type: 'string', required: false },
            affectedUsers: { type: 'number', required: false },
            occurredAt: { type: 'date', required: true },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['slack', 'webhook'],
        templates: {
            slack: 'critical-error-alert',
        },
        priority: 'high',
        retryPolicy: {
            attempts: 5,
            delay: 1000,
            backoff: 'exponential',
        },
    },

    'system.backup.completed': {
        description: 'System backup completed',
        schema: {
            backupId: { type: 'string', required: true },
            backupType: { type: 'string', required: true },
            size: { type: 'number', required: true },
            duration: { type: 'number', required: true },
            status: { type: 'string', required: true },
            completedAt: { type: 'date', required: true },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['slack'],
        templates: {
            slack: 'backup-status-report',
        },
        priority: 'low',
    },
};
