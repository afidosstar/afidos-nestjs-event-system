// ================================
// EXPORTS PRINCIPAUX DU PACKAGE
// ================================

import {EventPayloads, EventTypeConfig, EventTypesConfig, NotificationProviderConfig, PackageConfig } from './types/interfaces';

// Module principal
export { EventNotificationsModule } from './module/event-notifications.module';

// Services
export { EventEmitterService } from './services/event-emitter.service';
export { EventRoutingService } from './services/event-routing.service';
export { QueueService } from './services/queue.service';
export { RetryService } from './services/retry.service';

// Types et interfaces publiques
export {
    // Types de base
    EventPayloads,
    NotificationChannel,
    ProcessingMode,
    EventPriority,

    // Configuration
    EventTypeConfig,
    EventTypesConfig,
    NotificationProviderConfig,
    QueueConfig,
    PackageConfig,
    RetryPolicy,

    // Options et résultats
    EmitOptions,
    NotificationResult,
    EventEmissionResult,
    NotificationContext,
    QueuedEvent,

    // Provider interface
    NotificationProvider,

    // Stats et monitoring
    ProviderStats,
    SystemEvent
} from './types/interfaces';

// Providers
export { SmtpEmailProvider, SmtpConfig, EmailPayload } from './providers/email/smtp-email.provider';
export { HttpWebhookProvider, WebhookConfig, WebhookPayload } from './providers/webhook/http-webhook.provider';
export { ExternalServiceProvider, ExternalServiceConfig, ExternalServicePayload } from './providers/external-service/firebase-like.provider';

// Entités (pour les utilisateurs qui veulent les étendre)
export {
    EventTypeEntity,
    EventLogEntity,
    NotificationResultEntity,
    ProviderHealthEntity,
    EventStatsEntity
} from './entities';

// Commandes CLI
export { SyncEventTypesCommand } from './commands/sync-event-types.command';

// Tokens d'injection
export {
    EVENT_NOTIFICATIONS_CONFIG,
    EVENT_TYPES_CONFIG,
    PROVIDERS_CONFIG
} from './module/event-notifications.module';

// ================================
// HELPERS ET UTILS
// ================================

/**
 * Helper pour créer une configuration d'événement type-safe
 */
export function createEventTypeConfig<T extends EventPayloads>(
    config: EventTypesConfig<T>
): EventTypesConfig<T> {
    return config;
}

/**
 * Helper pour créer une configuration de provider
 */
export function createProviderConfig(
    providers: Record<string, NotificationProviderConfig>
): Record<string, NotificationProviderConfig> {
    return providers;
}

/**
 * Helper pour créer une configuration complète du package
 */
export function createPackageConfig<T extends EventPayloads>(
    config: PackageConfig<T>
): PackageConfig<T> {
    // Validation basique de la configuration
    if (!config.eventTypes || Object.keys(config.eventTypes).length === 0) {
        throw new Error('At least one event type must be configured');
    }

    if (!config.providers || Object.keys(config.providers).length === 0) {
        throw new Error('At least one provider must be configured');
    }

    // Valider que tous les canaux utilisés ont des providers
    const configuredChannels = new Set<string>();
    const availableChannels = new Set<string>();

    // Collecter les canaux utilisés dans les événements
    Object.values<EventTypeConfig>(config.eventTypes).forEach(eventConfig => {
        eventConfig.channels.forEach(channel => configuredChannels.add(channel));
    });

    // Collecter les canaux disponibles dans les providers
    Object.entries<NotificationProviderConfig>(config.providers).forEach(([channelName, providerConfig]) => {
        if (providerConfig.enabled !== false) {
            availableChannels.add(channelName);
        }
    });

    // Vérifier que tous les canaux utilisés ont des providers
    const missingProviders = Array.from(configuredChannels).filter(
        channel => !availableChannels.has(channel)
    );

    if (missingProviders.length > 0) {
        throw new Error(
            `Missing providers for channels: ${missingProviders.join(', ')}. ` +
            `Configure providers for these channels or remove them from event configurations.`
        );
    }

    return config;
}

