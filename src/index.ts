// ================================
// EXPORTS PRINCIPAUX DU PACKAGE
// ================================

import {EventPayloads, EventTypesConfig, NotificationProviderConfig, PackageConfig } from './types/interfaces';

// Module principal
export { EventNotificationsModule } from './module/event-notifications.module';

// Services
export { EventEmitterService } from './services/event-emitter.service';
export { NotificationOrchestratorService } from './services/notification-orchestrator.service';
export { QueueManagerService } from './services/queue-manager.service';
export { EventHandlerManagerService } from './services/event-handler-manager.service';
export { HandlerQueueManagerService } from './services/handler-queue-manager.service';

// Interfaces et types pour les handlers
export { EventHandler } from './interfaces/event-handler.interface';
export {
    HandlerQueueConfig,
    QueuedHandlerJob,
    EventHandlerContext
} from './types/handler-queue.types';

// Décorateurs et utilitaires pour les handlers
export {
    InjectableHandler,
    HandlerMetadata,
    HandlerRegistry,
    discoverEventHandlers,
    getHandlerMetadata
} from './decorators/injectable-handler.decorator';

// Drivers préconçus
export { HttpDriver } from './drivers/http.driver';
export { SmtpDriver } from './drivers/smtp.driver';

// Loaders et interfaces étendues
export { RecipientLoader, Recipient } from './loaders/recipient-loader.interface';

// Base class pour providers
export { BaseNotificationProvider } from './providers/base-notification-provider';

// Décorateur pour providers de notification
export {
    InjectableNotifier,
    NotifierRegistry,
    discoverNotificationProviders,
    getNotifierMetadata
} from './decorators/injectable-notifier.decorator';
export type { NotifierMetadata } from './decorators/injectable-notifier.decorator';

// Types et interfaces publiques
export {
    // Types de base
    EventPayloads,
    NotificationChannel,
    ProcessingMode,
    EventPriority,

    // Configuration
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

// Types pour drivers
export {
    HttpRequest,
    HttpResponse,
    EmailMessage,
    SmtpResponse,
    SmtpDriverConfig
} from './types/driver.types';

// No default providers - providers are now in examples/basic-usage/src/providers

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

    // Providers are validated dynamically - no static validation needed
    // Channels will be validated at runtime based on available providers

    return config;
}

