import { Injectable, Logger } from '@nestjs/common';
import {
    BaseNotificationProvider,
    Recipient,
    NotificationResult,
    NotificationContext,
    InjectableNotifier,
    RecipientDistribution
} from '@afidos/nestjs-event-notifications';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType } from '../../../entities/event-type.entity';
import { EmailTemplateProvider } from '../../template-providers/email-template.provider';

// Extension de l'interface Recipient pour ajouter le support email
declare module '@afidos/nestjs-event-notifications' {
    interface Recipient {
        email?: string;
        firstName?: string;
        lastName?: string;
    }
}

/**
 * Provider email simple utilisant EmailTemplateProvider
 */
@Injectable()
@InjectableNotifier({
    channel: 'email',
    description: 'Provider simple pour notifications email'
})
export class EmailProvider extends BaseNotificationProvider<'email'> {
    private readonly logger = new Logger(EmailProvider.name);

    constructor(
        private readonly mailerService: MailerService,
        private readonly templateProvider: EmailTemplateProvider,
        @InjectRepository(EventType)
        private readonly eventTypeRepository: Repository<EventType>
    ) {
        super();
    }

    async send(distribution: RecipientDistribution, payload: any, context: NotificationContext): Promise<NotificationResult[]> {
        try {
            // Extraire tous les destinataires avec email
            const allRecipients = this.extractAllRecipients(distribution);
            const emailRecipients = this.filterRecipientsByProperty(allRecipients, 'email');

            if (emailRecipients.length === 0) {
                return this.createSkippedResults(context, 'No email recipients found');
            }

            // Générer le contenu HTML via le template provider
            const htmlContent = await this.templateProvider.render(context.eventType, payload, context);
            
            // Obtenir le sujet depuis le context ou l'entité
            const subject = await this.getSubject(context);

            // Préparer les adresses email
            const emailAddresses = emailRecipients.map(r => `${r.name} <${r.email}>`);

            // Envoyer l'email
            const result = await this.mailerService.sendMail({
                to: emailAddresses,
                subject,
                html: htmlContent,
            });

            this.logger.log(`Email sent to ${emailRecipients.length} recipients for event ${context.eventType}`);

            return [this.createSentResult(context, {
                messageId: result.messageId,
                recipientCount: emailRecipients.length,
                accepted: result.accepted,
                rejected: result.rejected
            })];

        } catch (error) {
            this.logger.error(`Failed to send email for event ${context.eventType}: ${error.message}`);
            return this.createFailedResults(context, error.message);
        }
    }

    /**
     * Obtient le sujet depuis le context ou l'entité EventType
     */
    private async getSubject(context: NotificationContext): Promise<string> {
        // 1. Vérifier si le sujet est fourni dans le context/metadata
        if (context.metadata?.config?.subject) {
            return context.metadata.config.subject;
        }

        // 2. Chercher dans l'entité EventType en base de données
        try {
            const eventConfig = await this.eventTypeRepository.findOne({
                where: { name: context.eventType }
            });

            if (eventConfig?.subject) {
                return eventConfig.subject;
            }
        } catch (error) {
            this.logger.warn(`Impossible de récupérer le sujet depuis l'entité pour ${context.eventType}: ${error.message}`);
        }

        // 3. Fallback sur les sujets par défaut
        const defaultSubjects: Record<string, string> = {
            'user.created': '🎉 Bienvenue !',
            'order.created': '📦 Nouvelle commande',
            'order.shipped': '🚚 Commande expédiée',
            'system.error': '🚨 Erreur système',
            'system.maintenance': '🔧 Maintenance programmée'
        };

        return defaultSubjects[context.eventType] || `Notification: ${context.eventType}`;
    }

    /**
     * Délégation vers le template provider
     */
    async getAvailableTemplates(): Promise<string[]> {
        return this.templateProvider.getAvailableTemplates();
    }

    async hasTemplate(eventType: string): Promise<boolean> {
        return this.templateProvider.hasTemplate(eventType);
    }

    clearTemplateCache(): void {
        this.templateProvider.clearTemplateCache();
    }

    async healthCheck(): Promise<boolean> {
        try {
            return (await this.getAvailableTemplates()).length > 0;
        } catch (error) {
            this.logger.error(`Email provider health check failed: ${error.message}`);
            return false;
        }
    }

    validateConfig(_config: any): boolean | string[] {
        return true;
    }
}