// ================================
// EXPORTS PRINCIPAUX DU PACKAGE
// ================================

// ========== MODULE PRINCIPAL ==========
export { EventNotificationsModule } from './module/event-notifications.module';

// ========== SERVICES CORE ==========
export { EventEmitterService } from './services/event-emitter.service';
export { NotificationOrchestratorService } from './services/notification-orchestrator.service';
export { QueueManagerService } from './services/queue-manager.service';
export { EventHandlerManagerService } from './services/event-handler-manager.service';
export { HandlerQueueManagerService } from './services/handler-queue-manager.service';

// ========== QUEUE PROVIDERS ==========
// Note: Bull et BullMQ providers ne sont pas exportés car ils nécessitent des dépendances
// incompatibles entre elles. Utilisez FileQueueProvider (par défaut) ou importez 
// manuellement les providers Bull/BullMQ selon vos besoins spécifiques.
export { FileQueueProvider } from './queue/file-queue.provider';

// ========== INTERFACES ==========
// Event Handlers
export { EventHandler } from './interfaces/event-handler.interface';
export {
    HandlerQueueConfig,
    QueuedHandlerJob,
    EventHandlerContext
} from './types/handler-queue.types';

// Recipients
export {
    RecipientLoader,
    Recipient,
    RecipientDistribution,
    RecipientType
} from './loaders/recipient-loader.interface';

// ========== PROVIDERS ==========
export { BaseNotificationProvider } from './providers/base-notification-provider';

// ========== DÉCORATEURS ==========
// Handler Decorators
export {
    InjectableHandler,
    HandlerMetadata,
    HandlerRegistry,
    discoverEventHandlers,
    getHandlerMetadata
} from './decorators/injectable-handler.decorator';

// Notifier Decorators
export {
    InjectableNotifier,
    NotifierRegistry,
    discoverNotificationProviders,
    discoverAllNotificationProviders,
    getNotifierMetadata
} from './decorators/injectable-notifier.decorator';
export type { NotifierMetadata } from './decorators/injectable-notifier.decorator';

// ========== TYPES ET INTERFACES ==========
export {
    // Configuration principale
    EventTypeConfig,
    EventTypesConfig,
    PackageConfig,

    // Types de base
    EventPayloads,
    NotificationChannel,
    ProcessingMode,
    EventPriority,

    // Configuration avancée
    QueueConfig,
    RetryPolicy,

    // Émission et résultats
    EmitOptions,
    NotificationResult,
    EventEmissionResult,
    NotificationContext,
    QueuedEvent,

    // Provider interface
    NotificationProvider,

    // Monitoring
    ProviderStats,
    SystemEvent,

    QueueProvider
} from './types/interfaces';

// ========== TEMPLATE ENGINE ==========
export * from './template-engine';

// ========== TOKENS D'INJECTION ==========
export {
    EVENT_NOTIFICATIONS_CONFIG,
    EVENT_TYPES_CONFIG,
    PROVIDERS_CONFIG,
    QUEUE_PROVIDER_TOKEN,
    RECIPIENT_LOADER_TOKEN
} from './module/event-notifications.module';


// ================================
// HELPERS ET UTILS
// ================================

import type { EventPayloads, EventTypesConfig, PackageConfig } from './types/interfaces';

/**
 * Helper pour créer une configuration d'événement type-safe
 */
export function createEventTypeConfig<T extends EventPayloads>(
    config: EventTypesConfig<T>
): EventTypesConfig<T> {
    return config;
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


