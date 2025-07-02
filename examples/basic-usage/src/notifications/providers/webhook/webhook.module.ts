import { Module } from '@nestjs/common';
import { WebhookProvider } from './webhook.provider';
import { WebhookTemplateProvider } from '../../template-providers/webhook-template.provider';
import {TypeOrmModule} from "@nestjs/typeorm";
import {EventType} from "../../../entities/event-type.entity";

/**
 * Module dédié au provider Webhook
 * Encapsule tous les services nécessaires pour les notifications Webhook
 */
@Module({
    providers: [
        WebhookProvider,
        WebhookTemplateProvider,
    ],
    imports:[TypeOrmModule.forFeature([EventType])],
    exports: [
        WebhookProvider,
        WebhookTemplateProvider,
    ],
})
export class WebhookModule {
    constructor() {
        // Configuration spécifique au démarrage
        this.validateWebhookConfig();
    }

    /**
     * Valide la configuration Webhook au démarrage
     */
    private validateWebhookConfig() {
        const webhookSecret = process.env.WEBHOOK_SECRET;
        const webhookTimeout = process.env.WEBHOOK_TIMEOUT;

        if (!webhookSecret) {
            console.warn('⚠️  WEBHOOK_SECRET not configured');
            console.warn('   Set WEBHOOK_SECRET environment variable for secure webhooks');
        }

        if (webhookTimeout) {
            const timeout = parseInt(webhookTimeout);
            if (isNaN(timeout) || timeout < 1000 || timeout > 120000) {
                console.warn('⚠️  WEBHOOK_TIMEOUT should be between 1000 and 120000 milliseconds');
            }
        }

        // Vérifier les variables d'environnement optionnelles
        const retryAttempts = process.env.WEBHOOK_RETRY_ATTEMPTS;
        if (retryAttempts) {
            const attempts = parseInt(retryAttempts);
            if (isNaN(attempts) || attempts < 0 || attempts > 10) {
                console.warn('⚠️  WEBHOOK_RETRY_ATTEMPTS should be between 0 and 10');
            }
        }

        console.log('✅ Webhook module initialized');
    }

    /**
     * Configuration pour les tests
     */
    static forTest() {
        return {
            module: WebhookModule,
            providers: [
                {
                    provide: WebhookProvider,
                    useValue: {
                        send: jest.fn(),
                        healthCheck: jest.fn().mockResolvedValue(true),
                        validateConfig: jest.fn().mockReturnValue(true),
                    },
                },
                {
                    provide: WebhookTemplateProvider,
                    useValue: {
                        render: jest.fn().mockResolvedValue('{"test": "payload"}'),
                        hasTemplate: jest.fn().mockResolvedValue(true),
                        getAvailableTemplates: jest.fn().mockResolvedValue(['test']),
                        clearTemplateCache: jest.fn(),
                        validateTemplate: jest.fn().mockResolvedValue({ isValid: true }),
                        createSecurityHeaders: jest.fn().mockReturnValue({}),
                    },
                },
            ],
        };
    }

    /**
     * Configuration avec options personnalisées
     */
    static withConfig(config: {
        timeout?: number;
        retryAttempts?: number;
        secret?: string;
        defaultHeaders?: Record<string, string>;
    }) {
        return {
            module: WebhookModule,
            providers: [
                WebhookProvider,
                WebhookTemplateProvider,
                {
                    provide: 'WEBHOOK_CONFIG',
                    useValue: config,
                },
            ],
            exports: [WebhookProvider, WebhookTemplateProvider],
        };
    }
}
