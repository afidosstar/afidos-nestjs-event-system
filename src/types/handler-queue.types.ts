export interface HandlerQueueConfig {
    /**
     * Nom de la queue (par défaut: handler-{handlerName})
     */
    name?: string;

    /**
     * Mode de traitement
     */
    processing: 'sync' | 'async' | 'delayed';

    /**
     * Configuration du délai (pour mode delayed)
     */
    delay?: {
        /**
         * Délai en millisecondes
         */
        ms: number;
        /**
         * Stratégie de délai (fixed, exponential, custom)
         */
        strategy?: 'fixed' | 'exponential' | 'custom';
    };

    /**
     * Configuration des tentatives
     */
    retry?: {
        attempts: number;
        backoff?: {
            type: 'fixed' | 'exponential';
            delay: number;
        };
    };

    /**
     * Priorité dans la queue (1-10, 10 = plus haute priorité)
     */
    priority?: number;

    /**
     * Timeout d'exécution en millisecondes
     */
    timeout?: number;

    /**
     * Concurrence maximum pour ce handler
     */
    concurrency?: number;

    /**
     * Configuration Redis spécifique
     */
    redis?: {
        /**
         * Préfixe des clés Redis pour ce handler
         */
        keyPrefix?: string;
        /**
         * TTL des jobs en secondes
         */
        jobTTL?: number;
    };
}

export interface QueuedHandlerJob {
    id: string;
    handlerName: string;
    eventType: string;
    payload: any;
    context: EventHandlerContext;
    queuedAt: Date;
    attempts: number;
    priority: number;
}

export interface EventHandlerContext {
    eventId: string;
    correlationId: string;
    eventType: string;
    timestamp: Date;
    attempt: number;
    metadata?: Record<string, any>;
    
    /**
     * Informations sur la queue (si applicable)
     */
    queue?: {
        name: string;
        jobId: string;
        queuedAt: Date;
        processing: 'sync' | 'async' | 'delayed';
    };
    
    // Permet au handler d'accéder aux autres services si nécessaire
    getService?<T>(token: any): T;
}