import { NotificationProvider, NotificationResult, NotificationContext } from '../types/interfaces';
import {Recipient, RecipientDistribution} from '../loaders/recipient-loader.interface';
import { getNotifierMetadata } from '../decorators/injectable-notifier.decorator';
/**
 * Classe de base pour les providers de notification
 * Implémente les méthodes communes getChannelName() et getProviderName()
 * et fournit des utilitaires pour filtrer les destinataires
 */
export abstract class BaseNotificationProvider<Channel extends string> implements NotificationProvider {
    /**
     * Méthode abstraite à implémenter par chaque provider
     * Retourne un tableau de résultats pour chaque destinataire
     */
    abstract send(distribution: RecipientDistribution, payload: any, context: NotificationContext): Promise<NotificationResult[]>;

    /**
     * Méthode abstraite à implémenter par chaque provider
     */
    abstract healthCheck(): Promise<boolean>;

    /**
     * Méthode abstraite à implémenter par chaque provider
     */
    abstract validateConfig(config: any): boolean | string[];

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
     * Extrait tous les recipients d'une distribution
     */
    protected extractAllRecipients(distribution: RecipientDistribution): Recipient[] {
        return [
            ...distribution.MAIN,
            ...distribution.COPY,
            ...distribution.BLIND
        ];
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
     * Méthode utilitaire pour créer un résultat de notification standard
     */
    protected createNotificationResult(
        status: 'sent' | 'failed' | 'pending' | 'retrying' | 'skipped',
        context: NotificationContext,
        metadata?: Record<string, any>,
        error?: string
    ): NotificationResult {
        return {
            channel: this.getChannelName(),
            provider: this.getProviderName(),
            status,
            sentAt: new Date(),
            attempts: context.attempt,
            metadata,
            error
        };
    }

    /**
     * Méthode utilitaire pour créer un résultat "skipped" standard
     */
    protected createSkippedResult(
        context: NotificationContext,
        reason: string
    ): NotificationResult {
        return this.createNotificationResult('skipped', context, { reason });
    }

    /**
     * Méthode utilitaire pour créer un résultat "failed" standard
     */
    protected createFailedResult(
        context: NotificationContext,
        error: string,
        metadata?: Record<string, any>
    ): NotificationResult {
        return this.createNotificationResult('failed', context, metadata, error);
    }

    /**
     * Méthode utilitaire pour créer un résultat "sent" standard
     */
    protected createSentResult(
        context: NotificationContext,
        metadata?: Record<string, any>
    ): NotificationResult {
        return this.createNotificationResult('sent', context, metadata);
    }

    /**
     * Méthode utilitaire pour créer un tableau avec un seul résultat "skipped"
     */
    protected createSkippedResults(
        context: NotificationContext,
        reason: string
    ): NotificationResult[] {
        return [this.createSkippedResult(context, reason)];
    }

    /**
     * Méthode utilitaire pour créer un tableau avec un seul résultat "failed"
     */
    protected createFailedResults(
        context: NotificationContext,
        error: string,
        metadata?: Record<string, any>
    ): NotificationResult[] {
        return [this.createFailedResult(context, error, metadata)];
    }
}
