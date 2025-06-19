// ================================
// TYPES DE BASE ET INTERFACES PUBLIQUES
// ================================

/**
 * Interface de base que l'utilisateur étend pour définir ses types d'événements
 */
export interface EventPayloads {
    // L'utilisateur définit ses propres types d'événements
    // Exemple d'usage dans l'app consommatrice:
    // 'user.create': { userId: number; email: string; };
    // 'order.completed': { orderId: string; amount: number; };
}

/**
 * Type de base pour les canaux de notification
 * Les canaux sont définis dynamiquement par les providers configurés
 */
export type NotificationChannel = string;

/**
 * Modes de traitement des événements
 */
export type ProcessingMode = 'sync' | 'async';

/**
 * Priorités des événements
 */
export type EventPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Configuration d'un type d'événement
 */
export interface EventTypeConfig {
    /** Description du type d'événement */
    description: string;

    /** Canaux de notification à utiliser */
    channels: NotificationChannel[];

    /** Mode de traitement par défaut */
    defaultProcessing?: ProcessingMode;

    /** Attendre le résultat par défaut */
    waitForResult?: boolean;

    /** Nombre de tentatives en cas d'échec */
    retryAttempts?: number;

    /** Priorité de l'événement */
    priority?: EventPriority;

    /** Délai avant traitement (en ms) */
    delay?: number;

    /** Timeout pour l'attente de résultat (en ms) */
    timeout?: number;

    /** Validation des canaux (pour les canaux dynamiques) */
    validateChannels?: boolean;

    /** Canaux de fallback si les canaux principaux ne sont pas disponibles */
    fallbackChannels?: NotificationChannel[];
}

/**
 * Configuration complète des types d'événements
 */
export type EventTypesConfig<T extends EventPayloads = EventPayloads> = {
    [K in keyof T]: EventTypeConfig;
};
// export interface EventTypesConfig<T extends EventPayloads = EventPayloads> {
//     // @ts-ignore
//     [K in keyof T ]: EventTypeConfig;
// }
// export type EventTypesConfig<T extends EventPayloads> =
//     Record<keyof T, EventTypeConfig>;

/**
 * Interface de base pour les configurations de drivers
 * Les drivers peuvent étendre cette interface via module augmentation
 */
export interface DriverConfigurations {
    // Les drivers spécifiques étendent cette interface
    // Exemple d'usage dans le driver:
    // declare module './interfaces' {
    //   interface DriverConfigurations {
    //     'smtp': SmtpDriverConfig;
    //   }
    // }
}

/**
 * Type pour les drivers disponibles
 * Utilise les clés de DriverConfigurations + string pour les drivers personnalisés
 */
export type AvailableDrivers = keyof DriverConfigurations | string;

/**
 * Configuration de base d'un provider de notification
 */
export interface NotificationProviderConfig<T extends AvailableDrivers = AvailableDrivers> {
    /** Driver du provider (smtp, http, ou driver personnalisé) */
    driver: T;

    /** Configuration spécifique au driver */
    config: T extends keyof DriverConfigurations
        ? DriverConfigurations[T]
        : Record<string, any>;

    /** Provider activé ou non */
    enabled?: boolean;

    /** Timeout pour ce provider (en ms) */
    timeout?: number;
}

/**
 * Configuration de la queue Redis
 */
export interface QueueConfig {
    /** Configuration Redis */
    redis: {
        host: string;
        port: number;
        password?: string;
        db?: number;
        maxRetriesPerRequest?: number;
        retryDelayOnFailover?: number;
        enableReadyCheck?: boolean;
        family?: number;
    };

    /** Nombre de workers concurrents */
    concurrency?: number;

    /** Préfixe pour les clés Redis */
    prefix?: string;

    /** Configuration des tentatives */
    defaultJobOptions?: {
        attempts?: number;
        delay?: number;
        removeOnComplete?: number;
        removeOnFail?: number;
        backoff?: {
            type: string;
            delay: number;
        };
    };
}

/**
 * Configuration principale du package
 */
export interface PackageConfig<T extends EventPayloads = EventPayloads> {
    /** Configuration des types d'événements */
    eventTypes: EventTypesConfig<T>;

    /** Configuration des providers (optionnel avec auto-découverte) */
    providers?: Record<string, NotificationProviderConfig>;


    /** Configuration de la queue (optionnel) */
    queue?: QueueConfig;

    /** Mode de fonctionnement */
    mode?: 'api' | 'worker' | 'hybrid';

    /** Préfixe pour les tables de base de données */
    tablePrefix?: string;

    /** Options globales */
    global?: {
        /** Timeout global par défaut (en ms) */
        defaultTimeout?: number;

        /** Nombre de tentatives par défaut */
        defaultRetryAttempts?: number;

        /** Activer les logs détaillés */
        enableDetailedLogs?: boolean;

        /** Nombre maximum de notifications concurrentes */
        maxConcurrentNotifications?: number;

        /** Intervalle de health check (en ms) */
        healthCheckInterval?: number;

        /** Valider automatiquement les canaux dans les événements */
        validateChannels?: boolean;

        /** Utiliser les canaux de fallback en cas d'échec */
        useFallbackChannels?: boolean;
    };
}

/**
 * Options pour l'émission d'événements
 */
export interface EmitOptions {
    /** Attendre le résultat du traitement */
    waitForResult?: boolean;

    /** Mode de traitement forcé */
    mode?: ProcessingMode | 'auto';

    /** Alias pour mode (pour compatibilité) */
    processing?: ProcessingMode;

    /** ID de corrélation personnalisé */
    correlationId?: string;

    /** Timeout personnalisé (en ms) */
    timeout?: number;

    /** Priorité personnalisée */
    priority?: EventPriority;

    /** Délai avant traitement (en ms) */
    delay?: number;

    /** Nombre de tentatives personnalisé */
    retryAttempts?: number;

    /** Métadonnées additionnelles */
    metadata?: Record<string, any>;
}

/**
 * Résultat d'une notification
 */
export interface NotificationResult {
    /** Canal utilisé */
    channel: NotificationChannel;

    /** Provider utilisé */
    provider: string;

    /** Statut de l'envoi */
    status: 'sent' | 'failed' | 'pending' | 'retrying' | 'skipped';

    /** Message d'erreur si échec */
    error?: string;

    /** Date d'envoi */
    sentAt?: Date;

    /** Métadonnées du provider */
    metadata?: Record<string, any>;

    /** Nombre de tentatives */
    attempts?: number;

    /** Prochaine tentative prévue */
    nextRetryAt?: Date;
}

/**
 * Résultat de l'émission d'un événement
 */
export interface EventEmissionResult {
    /** ID unique de l'événement */
    eventId: string;

    /** ID de corrélation */
    correlationId: string;

    /** Mode de traitement utilisé */
    mode: ProcessingMode;

    /** Si on a attendu le résultat */
    waitedForResult: boolean;

    /** Résultats des notifications (si disponibles) */
    results?: NotificationResult[];

    /** Date de mise en queue */
    queuedAt?: Date;

    /** Date de traitement */
    processedAt?: Date;

    /** Durée totale de traitement (en ms) */
    processingDuration?: number;

    /** Métadonnées additionnelles */
    metadata?: Record<string, any>;
}

/**
 * Interface pour les providers de notification
 */
export interface NotificationProvider {
    /** Envoyer une notification */
    send(payload: any, context: NotificationContext): Promise<NotificationResult>;

    /** Vérifier la santé du provider */
    healthCheck(): Promise<boolean>;

    /** Valider la configuration */
    validateConfig(config: any): boolean | string[];
}

/**
 * Contexte d'une notification
 */
export interface NotificationContext {
    /** ID de l'événement */
    eventId: string;

    /** ID de corrélation */
    correlationId: string;

    /** Type d'événement */
    eventType: string;

    /** Tentative actuelle */
    attempt: number;

    /** Métadonnées additionnelles */
    metadata?: Record<string, any>;
}

/**
 * Événement interne pour la queue
 */
export interface QueuedEvent {
    /** ID unique de l'événement */
    eventId: string;

    /** Type d'événement */
    eventType: string;

    /** Payload de l'événement */
    payload: any;

    /** ID de corrélation */
    correlationId: string;

    /** Options d'émission */
    options?: EmitOptions;

    /** Tentative actuelle */
    attempt?: number;

    /** Date de création */
    createdAt: Date;
}

/**
 * Configuration pour la politique de retry
 */
export interface RetryPolicy {
    /** Nombre maximum de tentatives */
    maxAttempts: number;

    /** Délai initial (en ms) */
    initialDelay: number;

    /** Facteur de multiplication pour le backoff */
    backoffFactor: number;

    /** Délai maximum (en ms) */
    maxDelay: number;

    /** Fonction personnalisée pour calculer le délai */
    customDelayFunction?: (attempt: number) => number;
}

/**
 * Statistiques d'un provider
 */
export interface ProviderStats {
    /** Nom du provider */
    providerName: string;

    /** Canal */
    channel: NotificationChannel;

    /** Nombre total d'envois */
    totalSent: number;

    /** Nombre d'échecs */
    totalFailed: number;

    /** Taux de succès */
    successRate: number;

    /** Latence moyenne (en ms) */
    averageLatency: number;

    /** Dernière vérification de santé */
    lastHealthCheck: Date;

    /** Statut de santé */
    isHealthy: boolean;
}

/**
 * Événement système pour le monitoring
 */
export interface SystemEvent {
    /** Type d'événement système */
    type: 'provider.health.changed' | 'queue.full' | 'retry.exhausted' | 'config.updated';

    /** Timestamp */
    timestamp: Date;

    /** Données de l'événement */
    data: Record<string, any>;

    /** Niveau de sévérité */
    severity: 'info' | 'warning' | 'error' | 'critical';
}
