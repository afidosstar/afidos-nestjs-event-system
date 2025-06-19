import { Injectable, Logger } from '@nestjs/common';
import {
    NotificationProvider,
    HttpDriver,
    RecipientLoader,
    Recipient,
    NotificationResult,
    NotificationContext,
    InjectableNotifier
} from '@afidos/nestjs-event-notifications';
import { getNotifierMetadata } from '@afidos/nestjs-event-notifications';

// Extension de l'interface Recipient pour ajouter le support Telegram
declare module '@afidos/nestjs-event-notifications' {
    interface Recipient {
        telegramId?: string;
        telegramUsername?: string;
    }
}

export interface TelegramConfig {
    botToken: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    timeout?: number;
}

/**
 * Provider Telegram utilisant le HttpDriver préconçu
 */
@InjectableNotifier({
    channel: 'telegram',
    driver: 'http',
    description: 'Provider pour notifications Telegram via HTTP API'
})
@Injectable()
export class TelegramProvider implements NotificationProvider {
    readonly name = 'TelegramProvider';
    readonly channel = 'telegram';
    protected readonly property = 'telegramId';
    private readonly logger = new Logger(TelegramProvider.name);
    private readonly apiUrl: string;

    constructor(
        private readonly recipientLoader: RecipientLoader,
        private readonly httpDriver: HttpDriver,
        private readonly config: TelegramConfig
    ) {
        this.apiUrl = `https://api.telegram.org/bot${this.config.botToken}`;
    }

    async send(payload: any, context: NotificationContext): Promise<NotificationResult> {
        try {
            // 1. Charger tous les destinataires pour cet événement
            const allRecipients = await this.recipientLoader.load(context.eventType, payload);

            // 2. Filtrer par la propriété telegramId
            const telegramRecipients = this.filterRecipientsByProperty(allRecipients, 'telegramId');

            if (telegramRecipients.length === 0) {
                return {
                    channel: this.getChannelName(),
                    provider: this.getProviderName(),
                    status: 'skipped',
                    sentAt: new Date(),
                    attempts: context.attempt,
                    metadata: { reason: 'No telegram recipients found' }
                };
            }

            // 3. Prendre le premier recipient
            const recipient = telegramRecipients[0];
            const address = recipient.telegramId as string;
            
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

    private async sendToAddress(
        address: string,
        eventType: string,
        payload: any,
        recipient: Recipient,
        context: NotificationContext
    ): Promise<NotificationResult> {
        const startTime = Date.now();

        try {
            const message = this.buildTelegramMessage(eventType, payload, recipient);

            const response = await this.httpDriver.post(`${this.apiUrl}/sendMessage`, {
                chat_id: address,
                text: message,
                parse_mode: this.config.parseMode || 'HTML',
                disable_web_page_preview: true
            });

            const duration = Date.now() - startTime;

            if (response.status === 200 && response.data.ok) {
                this.logger.log(`Telegram message sent successfully to ${address} for event ${eventType}`);

                return {
                    channel: this.getChannelName(),
                    provider: this.getProviderName(),
                    status: 'sent',
                    sentAt: new Date(),
                    attempts: context.attempt,
                    metadata: {
                        messageId: response.data.result.message_id,
                        recipientId: recipient.id,
                        chatId: address,
                        duration,
                        telegramResponse: response.data.result
                    }
                };
            } else {
                throw new Error(`Telegram API error: ${response.data.description || 'Unknown error'}`);
            }

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error(`Failed to send Telegram message to ${address} for event ${eventType}: ${error.message}`);

            return {
                channel: this.getChannelName(),
                provider: this.getProviderName(),
                status: 'failed',
                error: error.message,
                sentAt: new Date(),
                attempts: context.attempt,
                metadata: {
                    recipientId: recipient.id,
                    chatId: address,
                    duration
                }
            };
        }
    }

    /**
     * Filtre les recipients qui ont une adresse pour une propriété donnée
     */
    private filterRecipientsByProperty<K extends keyof Recipient>(
        recipients: Recipient[],
        property: K
    ): Recipient[] {
        return recipients.filter(recipient => {
            const address = recipient[property];
            return address !== undefined && address !== null && address !== '';
        });
    }

    /**
     * Retourne le nom du provider pour les logs et métadonnées
     */
    private getProviderName(): string {
        return this.constructor.name;
    }

    /**
     * Récupère le nom du canal depuis les métadonnées du décorateur @InjectableNotifier
     */
    private getChannelName(): string {
        const metadata = getNotifierMetadata(this.constructor);
        return metadata?.channel || 'unknown';
    }

    /**
     * Construit le message Telegram selon le type d'événement
     */
    private buildTelegramMessage(eventType: string, payload: any, recipient: Recipient): string {
        const username = recipient.telegramUsername ? `@${recipient.telegramUsername}` : '';
        const recipientName = username || recipient.id;

        switch (eventType) {
            case 'user.created':
                return `
🎉 <b>Bienvenue ${recipientName} !</b>

Votre compte a été créé avec succès.
📧 Email: <code>${payload.email}</code>

Vous pouvez maintenant profiter de nos services !
                `.trim();

            case 'order.created':
                return `
📦 <b>Nouvelle commande</b>

Bonjour ${recipientName},
Votre commande #<code>${payload.id}</code> a été créée.

💰 Total: <b>${payload.total}€</b>
📅 Date: ${new Date().toLocaleDateString('fr-FR')}

Nous vous tiendrons informé de son statut.
                `.trim();

            case 'order.shipped':
                return `
🚚 <b>Commande expédiée</b>

Bonjour ${recipientName},
Votre commande #<code>${payload.id}</code> est en route !

📦 Suivi: <code>${payload.trackingNumber || 'N/A'}</code>
                `.trim();

            case 'system.error':
                return `
🚨 <b>Erreur système</b>

Une erreur critique s'est produite :
<pre>${payload.error || 'Erreur inconnue'}</pre>

🕐 ${new Date().toISOString()}
                `.trim();

            case 'system.maintenance':
                return `
🔧 <b>Maintenance programmée</b>

${payload.message || 'Maintenance en cours'}

⏰ Durée estimée: ${payload.duration || 'Non spécifiée'}
                `.trim();

            default:
                return `
📢 <b>Notification: ${eventType}</b>

${username ? `${username}\n` : ''}
<pre>${JSON.stringify(payload, null, 2)}</pre>

🔗 ID: <code>${recipient.id}</code>
                `.trim();
        }
    }

    /**
     * Vérifie la santé du provider Telegram
     */
    async healthCheck(): Promise<boolean> {
        try {
            const response = await this.httpDriver.get(`${this.apiUrl}/getMe`);
            return response.status === 200 && response.data.ok;
        } catch (error) {
            this.logger.error(`Telegram provider health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Valide la configuration Telegram
     */
    validateConfig(config: TelegramConfig): boolean | string[] {
        const errors: string[] = [];

        if (!config.botToken) {
            errors.push('botToken is required');
        }

        if (config.botToken && !config.botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
            errors.push('botToken must be in format "bot_id:bot_token"');
        }

        if (config.parseMode && !['HTML', 'Markdown', 'MarkdownV2'].includes(config.parseMode)) {
            errors.push('parseMode must be one of: HTML, Markdown, MarkdownV2');
        }

        if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
            errors.push('timeout must be between 1000 and 60000 milliseconds');
        }

        return errors.length === 0 ? true : errors;
    }

    /**
     * Méthodes utilitaires pour créer des messages spécifiques
     */
    static createSimpleMessage(text: string): any {
        return { text };
    }

    static createAlertMessage(title: string, message: string, severity: 'info' | 'warning' | 'error' = 'info'): any {
        const icons = { info: 'ℹ️', warning: '⚠️', error: '🚨' };
        return {
            text: `${icons[severity]} <b>${title}</b>\n\n${message}`,
            parse_mode: 'HTML'
        };
    }
}