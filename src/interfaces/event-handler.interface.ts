import { NotificationResult, NotificationContext } from '../types/interfaces';

/**
 * Interface pour les handlers d'événements
 * Chaque handler traite un type d'événement spécifique
 */
export interface EventHandler<T = any> {
    /**
     * Types d'événements que ce handler peut traiter
     */
    getEventTypes(): string[];

    /**
     * Traite un événement et retourne le résultat
     */
    handle(eventType: string, payload: T, context: NotificationContext): Promise<NotificationResult[]>;

    /**
     * Nom du handler pour les logs
     */
    getName(): string;

    /**
     * Priorité du handler (optionnel)
     */
    getPriority?(): number;
}