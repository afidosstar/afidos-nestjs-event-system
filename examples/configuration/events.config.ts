// Fichier de configuration pour la CLI
import { createEventTypeConfig } from '@afidos/nestjs-event-notifications';

export default createEventTypeConfig({
    'user.welcome': {
        description: 'Send welcome email to new user',
        channels: ['email'],
        defaultProcessing: 'async',
        retryAttempts: 3
    },
    'order.created': {
        description: 'Notify about new order',
        channels: ['webhook', 'external-service'],
        defaultProcessing: 'async',
        retryAttempts: 3
    },
    'system.alert': {
        description: 'System alert notification',
        channels: ['email', 'slack'],
        defaultProcessing: 'sync',
        waitForResult: true,
        priority: 'high',
        retryAttempts: 5
    }
});

// Usage de la CLI:
// npx nest-commander sync-event-types --config ./examples/configuration/events.config.ts --dry-run
// npx nest-commander sync-event-types --force --backup --verbose

