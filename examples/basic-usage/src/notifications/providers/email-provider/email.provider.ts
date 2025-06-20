import { Logger } from '@nestjs/common';
import {
    BaseNotificationProvider,
    RecipientLoader,
    Recipient,
    NotificationResult,
    NotificationContext,
    InjectableNotifier
} from '@afidos/nestjs-event-notifications';
import { StaticRecipientLoader } from '../../../loaders/static-recipient.loader';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType } from '../../../entities/event-type.entity';

// Extension de l'interface Recipient pour ajouter le support email
declare module '@afidos/nestjs-event-notifications' {
    interface Recipient {
        email?: string;
        firstName?: string;
        lastName?: string;
    }
}

/**
 * Provider email utilisant @nestjs-modules/mailer avec templates Handlebars
 */
@InjectableNotifier({
    channel: 'email',
    description: 'Provider pour notifications email via @nestjs-modules/mailer'
})
export class EmailProvider extends BaseNotificationProvider<'email'> {
    private readonly logger = new Logger(EmailProvider.name);

    constructor(
        recipientLoader: StaticRecipientLoader,
        private readonly mailerService: MailerService,
        @InjectRepository(EventType)
        private readonly eventTypeRepository: Repository<EventType>
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
            const recipientName = this.getRecipientName(recipient);
            const subject = await this.getSubjectFromConfig(eventType, payload);
            
            // Préparer le contexte pour le template
            const templateContext = {
                payload,
                recipient,
                recipientName,
                subject,
                timestamp: new Date(),
                estimatedDelivery: this.getEstimatedDelivery(eventType, payload),
                appUrl: process.env.APP_URL || 'http://localhost:3000'
            };
            
            // Utiliser @nestjs-modules/mailer pour envoyer l'email
            const result = await this.mailerService.sendMail({
                to: address,
                subject,
                template: this.getTemplateName(eventType),
                context: templateContext,
            });
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
     * Récupère le sujet depuis la configuration en base de données
     */
    private async getSubjectFromConfig(eventType: string, _payload: any): Promise<string> {
        try {
            const eventConfig = await this.eventTypeRepository.findOne({
                where: { name: eventType }
            });

            if (eventConfig && eventConfig.subject) {
                return eventConfig.subject;
            }

            // Fallback vers les sujets par défaut
            return this.buildSubject(eventType, _payload);
        } catch (error) {
            this.logger.warn(`Erreur lors de la récupération du sujet pour ${eventType}: ${error.message}`);
            return this.buildSubject(eventType, _payload);
        }
    }

    /**
     * Construit le sujet de l'email selon le type d'événement (fallback)
     */
    private buildSubject(eventType: string, _payload: any): string {
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
     * Calcule la durée estimée de livraison selon le type d'événement
     */
    private getEstimatedDelivery(eventType: string, payload: any): number {
        if (eventType === 'order.shipped') {
            // Utiliser la durée depuis le payload si disponible
            if (payload.estimatedDeliveryDays) {
                return payload.estimatedDeliveryDays;
            }
            // Sinon, valeur par défaut
            return 3;
        }
        return 0;
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
     * Détermine le nom du template à utiliser
     */
    private getTemplateName(eventType: string): string {
        // Vérifier si un template spécifique existe, sinon utiliser le défaut
        const specificTemplate = eventType;
        const defaultTemplate = 'default';
        
        // Pour l'instant, on assume que les templates existent
        // Une vérification plus robuste pourrait être ajoutée
        const availableTemplates = ['user.created', 'order.created', 'order.shipped'];
        
        return availableTemplates.includes(eventType) ? specificTemplate : defaultTemplate;
    }

    /**
     * Vérifie la santé du provider email
     */
    async healthCheck(): Promise<boolean> {
        try {
            // Test simple avec @nestjs-modules/mailer
            // On pourrait envoyer un email de test ou vérifier la configuration
            return true;
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

