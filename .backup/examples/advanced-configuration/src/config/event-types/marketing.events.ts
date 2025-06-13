import { EventTypesConfig } from '@afidos/nestjs-event-notifications';

export const marketingEvents: EventTypesConfig = {
    'marketing.campaign.started': {
        description: 'Marketing campaign launched',
        schema: {
            campaignId: { type: 'string', required: true },
            name: { type: 'string', required: true },
            type: { type: 'string', required: true },
            targetAudience: { type: 'object', required: true },
            startDate: { type: 'date', required: true },
            endDate: { type: 'date', required: false },
            budget: { type: 'number', required: false },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['slack'],
        templates: {
            slack: 'campaign-launch-notification',
        },
        priority: 'low',
    },

    'marketing.newsletter.sent': {
        description: 'Newsletter sent to subscribers',
        schema: {
            newsletterId: { type: 'string', required: true },
            subject: { type: 'string', required: true },
            recipientCount: { type: 'number', required: true },
            sentAt: { type: 'date', required: true },
            segmentIds: { type: 'array', required: false },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['slack'],
        templates: {
            slack: 'newsletter-sent-report',
        },
        priority: 'low',
    },

    'marketing.user.churned': {
        description: 'User churn detected',
        schema: {
            userId: { type: 'number', required: true },
            email: { type: 'string', required: true },
            lastActivity: { type: 'date', required: true },
            churnScore: { type: 'number', required: true },
            churnReasons: { type: 'array', required: false },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['email', 'slack'],
        templates: {
            email: 'winback-campaign',
            slack: 'churn-alert',
        },
        priority: 'normal',
        rateLimiting: {
            windowMs: 86400000, // 24 hours
            maxRequests: 1, // One winback email per day
        },
    },
};
