import { Logger } from '@nestjs/common';
import {
    BaseNotificationProvider,
    SmtpDriver,
    SmtpDriverConfig,
    EmailMessage,
    RecipientLoader,
    Recipient,
    NotificationResult,
    NotificationContext,
    InjectableNotifier
} from '@afidos/nestjs-event-notifications';

// Extension de l'interface Recipient pour ajouter le support email
declare module '@afidos/nestjs-event-notifications' {
    interface Recipient {
        email?: string;
        firstName?: string;
        lastName?: string;
    }
}

/**
 * Provider email utilisant le SmtpDriver préconçu
 */
@InjectableNotifier({
    channel: 'email',
    driver: 'smtp',
    description: 'Provider pour notifications email via SMTP'
})
export class EmailProvider extends BaseNotificationProvider {
    private readonly logger = new Logger(EmailProvider.name);

    constructor(
        recipientLoader: RecipientLoader,
        private readonly smtpDriver: SmtpDriver,
        private readonly fromEmail: string = 'noreply@example.com'
    ) {
        super(recipientLoader);
    }

    async send(payload: any, context: NotificationContext): Promise<NotificationResult> {
        try {
            // 1. Charger tous les destinataires pour cet événement
            const allRecipients = await this.recipientLoader.load(context.eventType, payload);

            // 2. Filtrer par la propriété email
            const emailRecipients = this.filterRecipientsByProperty(allRecipients, 'email');

            if (emailRecipients.length === 0) {
                return this.createSkippedResult(context, 'No email recipients found');
            }

            // 3. Prendre le premier recipient
            const recipient = emailRecipients[0];
            const address = recipient.email as string;

            return await this.sendToAddress(address, context.eventType, payload, recipient, context);

        } catch (error) {
            return this.createFailedResult(context, `Failed to send: ${error.message}`);
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
            const message: EmailMessage = {
                to: address,
                from: this.fromEmail,
                subject: this.buildSubject(eventType, payload),
                html: this.buildHtmlBody(eventType, payload, recipient),
                text: this.buildTextBody(eventType, payload, recipient)
            };

            const result = await this.smtpDriver.send(message);
            const duration = Date.now() - startTime;

            this.logger.log(`Email sent successfully to ${address} for event ${eventType}`);

            return this.createSentResult(context, {
                messageId: result.messageId,
                recipientId: recipient.id,
                duration,
                accepted: result.accepted,
                rejected: result.rejected
            });

        } catch (error) {
            const duration = Date.now() - startTime;

            this.logger.error(`Failed to send email to ${address} for event ${eventType}: ${error.message}`);

            return this.createFailedResult(context, error.message, {
                recipientId: recipient.id,
                duration,
                address
            });
        }
    }

    /**
     * Construit le sujet de l'email selon le type d'événement
     */
    private buildSubject(eventType: string, payload: any): string {
        const subjectMap: Record<string, string> = {
            'user.created': '🎉 Bienvenue !',
            'user.updated': '✅ Profil mis à jour',
            'order.created': '📦 Nouvelle commande',
            'order.shipped': '🚚 Commande expédiée',
            'order.delivered': '✅ Commande livrée',
            'system.error': '🚨 Erreur système',
            'system.maintenance': '🔧 Maintenance programmée'
        };

        return subjectMap[eventType] || `Notification: ${eventType}`;
    }

    /**
     * Construit le corps HTML de l'email
     */
    private buildHtmlBody(eventType: string, payload: any, recipient: Recipient): string {
        const recipientName = this.getRecipientName(recipient);

        switch (eventType) {
            case 'user.created':
                return `
                    <h2>Bienvenue ${recipientName} !</h2>
                    <p>Votre compte a été créé avec succès.</p>
                    <p><strong>Email:</strong> ${payload.email}</p>
                    <p>Vous pouvez maintenant vous connecter et profiter de nos services.</p>
                `;

            case 'order.created':
                return `
                    <h2>Nouvelle commande</h2>
                    <p>Bonjour ${recipientName},</p>
                    <p>Votre commande #${payload.id} a été créée avec succès.</p>
                    <p><strong>Total:</strong> ${payload.total}€</p>
                    <p>Nous vous tiendrons informé de son statut.</p>
                `;

            case 'order.shipped':
                return `
                    <h2>Commande expédiée</h2>
                    <p>Bonjour ${recipientName},</p>
                    <p>Votre commande #${payload.id} a été expédiée !</p>
                    <p><strong>Numéro de suivi:</strong> ${payload.trackingNumber || 'N/A'}</p>
                `;

            default:
                return `
                    <h2>Notification</h2>
                    <p>Bonjour ${recipientName},</p>
                    <p>Événement: <strong>${eventType}</strong></p>
                    <pre>${JSON.stringify(payload, null, 2)}</pre>
                `;
        }
    }

    /**
     * Construit le corps texte de l'email (fallback)
     */
    private buildTextBody(eventType: string, payload: any, recipient: Recipient): string {
        const recipientName = this.getRecipientName(recipient);

        switch (eventType) {
            case 'user.created':
                return `Bienvenue ${recipientName} ! Votre compte a été créé avec succès.`;

            case 'order.created':
                return `Bonjour ${recipientName}, votre commande #${payload.id} a été créée avec succès. Total: ${payload.total}€`;

            case 'order.shipped':
                return `Bonjour ${recipientName}, votre commande #${payload.id} a été expédiée ! Numéro de suivi: ${payload.trackingNumber || 'N/A'}`;

            default:
                return `Notification: ${eventType}\n\n${JSON.stringify(payload, null, 2)}`;
        }
    }

    /**
     * Obtient le nom du destinataire pour personnaliser les messages
     */
    private getRecipientName(recipient: Recipient): string {
        if (recipient.firstName && recipient.lastName) {
            return `${recipient.firstName} ${recipient.lastName}`;
        }
        if (recipient.firstName) {
            return recipient.firstName;
        }
        return recipient.email || 'Utilisateur';
    }

    /**
     * Vérifie la santé du provider email
     */
    async healthCheck(): Promise<boolean> {
        try {
            return await this.smtpDriver.healthCheck();
        } catch (error) {
            this.logger.error(`Email provider health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Valide la configuration du provider
     */
    validateConfig(_config: any): boolean | string[] {
        return true;
    }
}

