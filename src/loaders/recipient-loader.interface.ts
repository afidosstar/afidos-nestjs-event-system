/**
 * Interface de base pour les destinataires
 */
export interface BaseRecipient {
    id: string;
    preferences?: {
        enabled: boolean;
        schedule?: string; // cron expression pour planifier les notifications
        timezone?: string;
    };
}

/**
 * Interface Recipient extensible via module augmentation
 * Chaque provider peut étendre cette interface avec ses propriétés spécifiques
 */
export interface Recipient extends BaseRecipient {
    // Les providers étendront cette interface via module augmentation
    // Par exemple : email?: string; telegramId?: string; etc.
}

/**
 * Interface pour charger les destinataires depuis différentes sources
 */
export interface RecipientLoader {
    /**
     * Charge les destinataires pour un événement donné
     * @param eventType Le type d'événement (ex: 'user.signup', 'system.error')
     * @param payload Les données de l'événement
     * @returns Les destinataires avec toutes leurs informations de contact
     */
    load(eventType: string, payload: any): Promise<Recipient[]>;
}