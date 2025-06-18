import { HandlerQueueConfig, EventHandlerContext } from '../types/handler-queue.types';

export interface EventHandler<TPayload = any, TResult = any> {
    /**
     * Nom unique du handler
     */
    getName(): string;

    /**
     * Types d'événements que ce handler peut traiter
     */
    getEventTypes(): string[];

    /**
     * Priorité d'exécution (plus élevé = priorité plus haute)
     */
    getPriority?(): number;

    /**
     * Configuration de la queue pour ce handler
     */
    getQueueConfig?(): HandlerQueueConfig;

    /**
     * Exécute le traitement de l'événement
     */
    execute(eventType: string, payload: TPayload, context: EventHandlerContext): Promise<TResult>;

    /**
     * Vérifie si le handler peut traiter cet événement
     */
    canHandle(eventType: string): boolean;

    /**
     * Vérifie si le handler est disponible/actif
     */
    isHealthy?(): Promise<boolean>;

    /**
     * Callback appelé avant la mise en queue (optionnel)
     */
    beforeQueue?(eventType: string, payload: TPayload, context: EventHandlerContext): Promise<void>;

    /**
     * Callback appelé après l'exécution réussie (optionnel)
     */
    afterExecute?(eventType: string, payload: TPayload, result: TResult, context: EventHandlerContext): Promise<void>;

    /**
     * Callback appelé en cas d'erreur (optionnel)
     */
    onError?(error: Error, eventType: string, payload: TPayload, context: EventHandlerContext): Promise<void>;
}