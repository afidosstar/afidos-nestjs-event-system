import { EventTypesConfig } from '@afidos/nestjs-event-notifications';

export const userEvents: EventTypesConfig = {
    'user.registered': {
        description: 'New user registration with enhanced data',
        schema: {
            userId: { type: 'number', required: true },
            email: { type: 'string', required: true },
            firstName: { type: 'string', required: true },
            lastName: { type: 'string', required: true },
            registrationSource: { type: 'string', required: false },
            referralCode: { type: 'string', required: false },
            userAgent: { type: 'string', required: false },
            ipAddress: { type: 'string', required: false },
            preferences: { type: 'object', required: false },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['email', 'slack'],
        templates: {
            email: 'user-welcome-v2',
            slack: 'user-registered-alert',
        },
        priority: 'normal',
        rateLimiting: {
            windowMs: 60000,
            maxRequests: 1, // Only one welcome email per minute per user
        },
    },

    'user.email.verified': {
        description: 'User email verification completed',
        schema: {
            userId: { type: 'number', required: true },
            email: { type: 'string', required: true },
            verificationToken: { type: 'string', required: true },
            verifiedAt: { type: 'date', required: true },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['email', 'webhook'],
        templates: {
            email: 'email-verified-confirmation',
        },
        priority: 'high',
    },

    'user.profile.updated': {
        description: 'User profile information updated',
        schema: {
            userId: { type: 'number', required: true },
            updatedFields: { type: 'array', required: true },
            previousValues: { type: 'object', required: false },
            newValues: { type: 'object', required: true },
            updatedBy: { type: 'string', required: true },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['email'],
        templates: {
            email: 'profile-update-notification',
        },
        priority: 'low',
    },

    'user.password.changed': {
        description: 'User password successfully changed',
        schema: {
            userId: { type: 'number', required: true },
            email: { type: 'string', required: true },
            changedAt: { type: 'date', required: true },
            ipAddress: { type: 'string', required: false },
            userAgent: { type: 'string', required: false },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['email', 'sms'],
        templates: {
            email: 'password-changed-security-alert',
            sms: 'password-changed-sms',
        },
        priority: 'high',
        retryPolicy: {
            attempts: 5,
            delay: 1000,
            backoff: 'exponential',
        },
    },

    'user.suspicious.activity': {
        description: 'Suspicious user activity detected',
        schema: {
            userId: { type: 'number', required: true },
            activityType: { type: 'string', required: true },
            riskScore: { type: 'number', required: true },
            details: { type: 'object', required: true },
            detectedAt: { type: 'date', required: true },
            ipAddress: { type: 'string', required: false },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['email', 'sms', 'slack'],
        templates: {
            email: 'security-alert',
            sms: 'security-alert-sms',
            slack: 'security-alert-admin',
        },
        priority: 'high',
        retryPolicy: {
            attempts: 5,
            delay: 500,
            backoff: 'exponential',
            maxDelay: 10000,
        },
    },
};
