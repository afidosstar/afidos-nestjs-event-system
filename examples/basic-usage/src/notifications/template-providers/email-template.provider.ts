import { Injectable } from '@nestjs/common';
import {
    BaseTemplateProvider,
    TemplateConfig,
    NotificationContext
} from '@afidos/nestjs-event-notifications';

/**
 * Interface pour les données enrichies des emails
 */
interface EmailEnrichedData {
    // Données originales
    [key: string]: any;

    // Données enrichies automatiquement
    appUrl: string;
    supportUrl: string;
    unsubscribeUrl: string;
    currentDate: string;
    currentYear: number;
    eventId: string;
    correlationId: string;

    // Helpers pour les templates
    userName: string;
    userEmail: string;
    companyName: string;
}

/**
 * Provider de templates pour les emails utilisant des fichiers Handlebars
 */
@Injectable()
@TemplateConfig({
    engine: 'handlebars',
    templatesPath: './src/notifications/template-providers/templates/email',
    templateExtension: '.hbs',
    enableCache: true,
    cacheTtl: 300000, // 5 minutes
    helpers: {
        // Helper personnalisé pour formater les prix
        formatPrice: (price: number) => {
            return new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR'
            }).format(price);
        },

        // Helper pour les liens de tracking
        trackingLink: (trackingNumber: string) => {
            return `https://tracking.example.com/${trackingNumber}`;
        }
    }
})
export class EmailTemplateProvider extends BaseTemplateProvider<any, EmailEnrichedData> {

    /**
     * Enrichit les données pour les templates email
     */
    async enrichData(payload: any, context: NotificationContext): Promise<EmailEnrichedData> {
        const baseData = this.createBaseEnrichedData(payload, context);

        return {
            ...baseData,

            // URLs spécifiques
            appUrl: process.env.APP_URL || 'http://localhost:3000',
            supportUrl: `${process.env.APP_URL || 'http://localhost:3000'}/support`,
            unsubscribeUrl: `${process.env.APP_URL || 'http://localhost:3000'}/unsubscribe/${payload.userId || 'unknown'}`,

            // Informations temporelles
            currentDate: new Date().toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            currentYear: new Date().getFullYear(),

            // Informations utilisateur simplifiées
            userName: this.extractUserName(payload),
            userEmail: payload.email || payload.user?.email || '',

            // Informations entreprise
            companyName: process.env.COMPANY_NAME || 'Notre Entreprise',
        };
    }

    /**
     * Rend le template en utilisant les fichiers Handlebars
     */
    async renderTemplate(eventType: string, enrichedData: EmailEnrichedData): Promise<string> {
        return this.renderFromFile(eventType, enrichedData);
    }

    /**
     * Extrait le nom d'utilisateur depuis le payload
     */
    private extractUserName(payload: any): string {
        if (payload.firstName && payload.lastName) {
            return `${payload.firstName} ${payload.lastName}`;
        }

        if (payload.name) {
            return payload.name;
        }

        if (payload.user?.name) {
            return payload.user.name;
        }

        if (payload.user?.firstName && payload.user?.lastName) {
            return `${payload.user.firstName} ${payload.user.lastName}`;
        }

        return payload.email || payload.user?.email || 'Utilisateur';
    }
}
