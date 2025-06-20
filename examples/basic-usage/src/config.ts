import {
    EventPayloads,
    createPackageConfig,
    createEventTypeConfig,
} from '@afidos/nestjs-event-notifications'
import * as dotenv from 'dotenv'

dotenv.config();

// 1. Définir les types d'événements de l'application
export interface MyAppEvents extends EventPayloads {
    'user.created': {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
    };
    'user.updated': {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
    };
    'order.created': {
        id: string;
        userId: number;
        customerEmail: string;
        customerName: string;
        total: number;
        items: Array<{ productId: string; quantity: number; price: number; }>;
    };
    'order.shipped': {
        id: string;
        userId: number;
        customerEmail: string;
        customerName: string;
        trackingNumber?: string;
    };
    'order.delivered': {
        id: string;
        userId: number;
        customerEmail: string;
        customerName: string;
    };
    'system.error': {
        error: string;
        timestamp: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    };
    'system.maintenance': {
        message: string;
        duration?: string;
        startTime: string;
    };
}

// 2. Configuration des types d'événements
export const eventTypesConfig = createEventTypeConfig<MyAppEvents>({
    'user.created': {
        description: 'Nouvel utilisateur créé',
        channels: ['email', 'telegram', 'webhook'],
        defaultProcessing: 'async',
        waitForResult: false,
        retryAttempts: 3,
        priority: 'normal'
    },
    'user.updated': {
        description: 'Utilisateur mis à jour',
        channels: ['email'],
        defaultProcessing: 'async',
        waitForResult: false,
        retryAttempts: 2,
        priority: 'low'
    },
    'order.created': {
        description: 'Nouvelle commande créée',
        channels: ['email', 'telegram', 'webhook'],
        defaultProcessing: 'async',
        waitForResult: false,
        retryAttempts: 3,
        priority: 'normal'
    },
    'order.shipped': {
        description: 'Commande expédiée',
        channels: ['email', 'telegram'],
        defaultProcessing: 'async',
        waitForResult: false,
        retryAttempts: 2,
        priority: 'normal'
    },
    'order.delivered': {
        description: 'Commande livrée',
        channels: ['email'],
        defaultProcessing: 'async',
        waitForResult: false,
        retryAttempts: 2,
        priority: 'low'
    },
    'system.error': {
        description: 'Erreur système',
        channels: ['email', 'telegram', 'webhook'],
        defaultProcessing: 'sync',
        waitForResult: true,
        priority: 'high',
        retryAttempts: 5,
        timeout: 5000
    },
    'system.maintenance': {
        description: 'Maintenance programmée',
        channels: ['email', 'telegram'],
        defaultProcessing: 'async',
        waitForResult: false,
        retryAttempts: 1,
        priority: 'normal'
    }
});

// 3. Configuration complète du package
export const packageConfig = createPackageConfig<MyAppEvents>({
    eventTypes: eventTypesConfig,

    queue: {
        redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0')
        },
        concurrency: 5,
        prefix: 'basic-usage-notifications',
        defaultJobOptions: {
            attempts: 3,
            delay: 1000,
            removeOnComplete: 100,
            removeOnFail: 50
        }
    },

    mode: 'api',

    global: {
        defaultTimeout: 30000,
        defaultRetryAttempts: 3,
        enableDetailedLogs: process.env.NODE_ENV === 'development'
    }
});
