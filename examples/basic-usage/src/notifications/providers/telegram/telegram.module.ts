import { Module } from '@nestjs/common';
import { TelegramProvider } from './telegram.provider';
import { TelegramTemplateProvider } from '../../template-providers/telegram-template.provider';

/**
 * Module dédié au provider Telegram
 * Encapsule tous les services nécessaires pour les notifications Telegram
 */
@Module({
    providers: [
        TelegramProvider,
        TelegramTemplateProvider,
    ],
    exports: [
        TelegramProvider,
        TelegramTemplateProvider,
    ],
})
export class TelegramModule {
    constructor() {
        // Configuration spécifique au démarrage si nécessaire
        this.validateTelegramConfig();
    }

    /**
     * Valide la configuration Telegram au démarrage
     */
    private validateTelegramConfig() {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!botToken || botToken === '123456:ABC-DEF') {
            console.warn('⚠️  TELEGRAM_BOT_TOKEN not configured or using default value');
            console.warn('   Set TELEGRAM_BOT_TOKEN environment variable for production use');
        }

        // Valider le format du token
        if (botToken && !botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
            console.error('❌ Invalid TELEGRAM_BOT_TOKEN format. Should be: bot_id:bot_token');
        }

        console.log('✅ Telegram module initialized');
    }

    /**
     * Configuration pour les tests
     */
    static forTest() {
        return {
            module: TelegramModule,
            providers: [
                {
                    provide: TelegramProvider,
                    useValue: {
                        send: jest.fn(),
                        healthCheck: jest.fn().mockResolvedValue(true),
                        validateConfig: jest.fn().mockReturnValue(true),
                    },
                },
                {
                    provide: TelegramTemplateProvider,
                    useValue: {
                        render: jest.fn().mockResolvedValue('Test message'),
                        hasTemplate: jest.fn().mockReturnValue(true),
                        getAvailableTemplates: jest.fn().mockReturnValue(['test']),
                        clearCache: jest.fn(),
                    },
                },
            ],
        };
    }
}