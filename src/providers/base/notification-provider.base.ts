import { RecipientLoader, Recipient } from '../../loaders/recipient-loader.interface';
import { NotificationResult, NotificationContext } from '../../types/interfaces';
import { getNotifierMetadata } from '../../decorators/injectable-notifier.decorator';

/**
 * Provider de notification abstrait avec support des extensions d'interface TypeScript
 * Chaque provider concret étend cette classe et définit son channel via une extension d'interface
 */
export abstract class NotificationProvider<TChannel extends keyof Recipient = any> {
    /**
     * La propriété du Recipient à récupérer pour l'adresse (optionnel)
     */
    protected readonly property?: TChannel;

    constructor(
        protected readonly recipientLoader: RecipientLoader
    ) {}

    /**
     * Envoie une notification pour un événement donné
     * Implémentation par défaut utilisant sendToAddress
     */
    async send(payload: any, context: NotificationContext): Promise<NotificationResult> {
        try {
            // 1. Charger tous les destinataires pour cet événement
            const allRecipients = await this.recipientLoader.load(context.eventType, payload);

            // 2. Si property est défini, filtrer par cette propriété
            let targetRecipients = allRecipients;
            if (this.property) {
                targetRecipients = this.filterRecipientsByProperty(allRecipients, this.property);
            }

            if (targetRecipients.length === 0) {
                return {
                    channel: this.getChannelName(),
                    provider: this.getProviderName(),
                    status: 'skipped',
                    sentAt: new Date(),
                    attempts: context.attempt,
                    metadata: { reason: 'No recipients found' }
                };
            }

            // 3. Prendre le premier recipient (les providers peuvent override pour traiter tous)
            const recipient = targetRecipients[0];
            const address = this.property ? recipient[this.property] as string : this.extractAddress(recipient);
            
            return await this.sendToAddress(address, context.eventType, payload, recipient, context);

        } catch (error) {
            return {
                channel: this.getChannelName(),
                provider: this.getProviderName(),
                status: 'failed',
                error: `Failed to send: ${error.message}`,
                sentAt: new Date(),
                attempts: context.attempt
            };
        }
    }

    /**
     * Extrait l'adresse du recipient (à override si property n'est pas utilisé)
     */
    protected extractAddress(_recipient: Recipient): string {
        throw new Error(`extractAddress must be implemented in ${this.getProviderName()} or property must be defined`);
    }

    /**
     * Envoie une notification à une adresse spécifique
     * Doit être implémentée par chaque provider concret
     */
    protected abstract sendToAddress(
        address: string,
        eventType: string,
        payload: any,
        recipient: Recipient,
        context: NotificationContext
    ): Promise<NotificationResult>;

    /**
     * Retourne le nom du provider pour les logs et métadonnées
     */
    protected getProviderName(): string {
        return this.constructor.name;
    }

    /**
     * Récupère le nom du canal depuis les métadonnées du décorateur @InjectableNotifier
     */
    protected getChannelName(): string {
        const metadata = getNotifierMetadata(this.constructor);
        return metadata?.channel || 'unknown';
    }

    /**
     * Filtre les recipients qui ont une adresse pour une propriété donnée
     */
    protected filterRecipientsByProperty<K extends keyof Recipient>(
        recipients: Recipient[],
        property: K
    ): Recipient[] {
        return recipients.filter(recipient => {
            const address = recipient[property];
            return address !== undefined && address !== null && address !== '';
        });
    }

    /**
     * Détermine si on doit envoyer la notification à ce destinataire
     * Vérifie les préférences, l'horaire, etc.
     */
    protected shouldSendToRecipient(recipient: Recipient, _eventType: string, _payload: any): boolean {
        // Vérifier si les notifications sont activées pour ce destinataire
        if (recipient.preferences?.enabled === false) {
            return false;
        }

        // TODO: Vérifier l'horaire (schedule) si défini
        // TODO: Vérifier d'autres critères selon le type d'événement

        return true;
    }

    /**
     * Vérifie la santé du provider
     * Peut être surchargée par les providers concrets
     */
    async healthCheck(): Promise<boolean> {
        return true;
    }

    /**
     * Valide la configuration du provider
     * Peut être surchargée par les providers concrets
     */
    validateConfig(_config: any): boolean | string[] {
        return true;
    }
}