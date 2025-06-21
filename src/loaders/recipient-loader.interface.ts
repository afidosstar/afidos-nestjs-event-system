/**
 * Interface de base pour les destinataires
 */
export interface BaseRecipient {
    id: string;
    name: string;
    preferences?: {
        enabled: boolean;
        schedule?: string; // cron expression pour planifier les notifications
        timezone?: string;
    };
}
export enum RecipientType {
    MAIN = 'MAIN',     // Destinataires principaux
    COPY = 'COPY',     // Destinataires en copie
    BLIND = 'BLIND'    // Destinataires aveugles
}

export interface RecipientDistribution extends Record<RecipientType, Recipient[]> {
    name: string
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
    load(eventType: string, payload: any): Promise<RecipientDistribution[]>;
}
