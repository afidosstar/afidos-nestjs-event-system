import { Injectable, Logger } from '@nestjs/common';
import { RecipientLoader, Recipient } from '@afidos/nestjs-event-notifications';

/**
 * Loader de destinataires statique pour l'exemple
 * En production, ceci pourrait être remplacé par un loader qui va chercher
 * les destinataires dans une base de données, une API, etc.
 */
@Injectable()
export class StaticRecipientLoader implements RecipientLoader {
    private readonly logger = new Logger(StaticRecipientLoader.name);

    // Configuration statique des destinataires par type d'événement
    private readonly eventRecipients: Record<string, (payload: any) => Recipient[]> = {
        // Événements utilisateur
        'user.created': (payload) => [
            {
                id: payload.id?.toString() || 'new-user',
                email: payload.email,
                firstName: payload.firstName,
                lastName: payload.lastName,
                preferences: { enabled: true }
            }
        ],

        'user.updated': (payload) => [
            {
                id: payload.id?.toString() || 'updated-user',
                email: payload.email,
                firstName: payload.firstName,
                lastName: payload.lastName,
                preferences: { enabled: true }
            }
        ],

        // Événements commande
        'order.created': (payload) => [
            {
                id: payload.userId?.toString() || 'customer',
                email: payload.customerEmail,
                firstName: payload.customerName?.split(' ')[0],
                lastName: payload.customerName?.split(' ').slice(1).join(' '),
                preferences: { enabled: true }
            }
        ],

        'order.shipped': (payload) => [
            {
                id: payload.userId?.toString() || 'customer',
                email: payload.customerEmail,
                firstName: payload.customerName?.split(' ')[0],
                lastName: payload.customerName?.split(' ').slice(1).join(' '),
                preferences: { enabled: true }
            }
        ],

        'order.delivered': (payload) => [
            {
                id: payload.userId?.toString() || 'customer',
                email: payload.customerEmail,
                firstName: payload.customerName?.split(' ')[0],
                lastName: payload.customerName?.split(' ').slice(1).join(' '),
                preferences: { enabled: true }
            }
        ],

        // Événements système (notifications aux admins)
        'system.error': () => this.getSystemAdmins(),
        'system.maintenance': () => this.getAllUsers(),

        // Événement par défaut
        'default': (payload) => [
            {
                id: 'admin',
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'System',
                telegramId: process.env.ADMIN_TELEGRAM_ID,
                webhookUrl: process.env.ADMIN_WEBHOOK_URL,
                preferences: { enabled: true }
            }
        ]
    };

    async load(eventType: string, payload: any): Promise<Recipient[]> {
        this.logger.debug(`Loading recipients for event: ${eventType}`);

        try {
            // Chercher une configuration spécifique pour ce type d'événement
            const loader = this.eventRecipients[eventType] || this.eventRecipients['default'];
            const recipients = loader(payload);

            // Filtrer les destinataires selon leurs préférences
            const enabledRecipients = recipients.filter(recipient => 
                recipient.preferences?.enabled !== false
            );

            this.logger.debug(`Found ${enabledRecipients.length} enabled recipients for event ${eventType}`);

            return enabledRecipients;

        } catch (error) {
            this.logger.error(`Failed to load recipients for event ${eventType}: ${error.message}`);
            return [];
        }
    }

    /**
     * Retourne la liste des administrateurs système
     */
    private getSystemAdmins(): Recipient[] {
        return [
            {
                id: 'admin1',
                email: 'admin@example.com',
                firstName: 'Admin',
                lastName: 'Principal',
                telegramId: process.env.ADMIN_TELEGRAM_ID,
                webhookUrl: process.env.ADMIN_WEBHOOK_URL,
                preferences: { enabled: true }
            },
            {
                id: 'admin2',
                email: 'tech@example.com',
                firstName: 'Admin',
                lastName: 'Technique',
                telegramId: process.env.TECH_TELEGRAM_ID,
                preferences: { enabled: true }
            }
        ].filter(admin => 
            // Inclure seulement les admins qui ont au moins un moyen de contact configuré
            admin.email || admin.telegramId || admin.webhookUrl
        );
    }

    /**
     * Retourne tous les utilisateurs (pour les annonces générales)
     */
    private getAllUsers(): Recipient[] {
        // En production, ceci viendrait d'une base de données
        return [
            ...this.getSystemAdmins(),
            {
                id: 'user1',
                email: 'user1@example.com',
                firstName: 'John',
                lastName: 'Doe',
                preferences: { enabled: true }
            },
            {
                id: 'user2',
                email: 'user2@example.com',
                firstName: 'Jane',
                lastName: 'Smith',
                telegramId: process.env.USER_TELEGRAM_ID,
                preferences: { enabled: true }
            }
        ];
    }

    /**
     * Ajoute un destinataire dynamiquement (pour les tests)
     */
    addEventRecipients(eventType: string, recipientLoader: (payload: any) => Recipient[]): void {
        this.eventRecipients[eventType] = recipientLoader;
        this.logger.debug(`Added custom recipient loader for event: ${eventType}`);
    }

    /**
     * Retourne la configuration actuelle (pour debug)
     */
    getConfiguration(): Record<string, string[]> {
        const config: Record<string, string[]> = {};
        
        Object.keys(this.eventRecipients).forEach(eventType => {
            try {
                const recipients = this.eventRecipients[eventType]({});
                config[eventType] = recipients.map(r => r.id);
            } catch (error) {
                config[eventType] = ['Error loading recipients'];
            }
        });

        return config;
    }
}