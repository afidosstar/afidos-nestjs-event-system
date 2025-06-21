import { Module, DynamicModule, Provider, Type } from '@nestjs/common';
import { 
    TemplateEngineConfig, 
    TemplateConfigMetadata 
} from './interfaces/template-engine.interface';
import { BaseTemplateProvider, TEMPLATE_CONFIG_TOKEN } from './providers/base-template.provider';
import { HandlebarsEngine } from './engines/handlebars.engine';
import { SimpleEngine } from './engines/simple.engine';
import { FileTemplateLoader } from './loaders/file-template.loader';
import { FunctionTemplateLoader } from './loaders/function-template.loader';
import { getTemplateConfig } from './decorators/template-config.decorator';

/**
 * Configuration pour le module de templates
 */
export interface NotificationTemplateModuleConfig {
    /** Configuration globale par défaut */
    defaultConfig?: TemplateEngineConfig;
    
    /** Providers de templates à enregistrer */
    providers?: Type<BaseTemplateProvider>[];
    
    /** Configuration spécifique par provider */
    providerConfigs?: Map<Type<BaseTemplateProvider>, TemplateConfigMetadata>;
    
    /** Mode global (true = synchrone, false = asynchrone) */
    isGlobal?: boolean;
}

/**
 * Module pour la gestion des templates de notifications
 */
@Module({})
export class NotificationTemplateModule {
    
    /**
     * Configuration statique du module
     */
    static forRoot(config?: NotificationTemplateModuleConfig): DynamicModule {
        const providers = this.createProviders(config);
        
        return {
            module: NotificationTemplateModule,
            providers,
            exports: providers,
            global: config?.isGlobal || false
        };
    }

    /**
     * Configuration asynchrone du module
     */
    static forRootAsync(options: {
        useFactory?: (...args: any[]) => Promise<NotificationTemplateModuleConfig> | NotificationTemplateModuleConfig;
        inject?: any[];
        imports?: any[];
    }): DynamicModule {
        const asyncProviders = this.createAsyncProviders(options);
        
        return {
            module: NotificationTemplateModule,
            imports: options.imports || [],
            providers: [
                ...asyncProviders,
                // Les providers spécifiques seront créés dynamiquement
            ],
            exports: asyncProviders,
            global: true
        };
    }

    /**
     * Configuration pour un feature module
     */
    static forFeature(providers: Type<BaseTemplateProvider>[]): DynamicModule {
        const featureProviders = providers.map(provider => this.createProviderWithConfig(provider));
        
        return {
            module: NotificationTemplateModule,
            providers: featureProviders,
            exports: featureProviders
        };
    }

    /**
     * Créer les providers pour la configuration statique
     */
    private static createProviders(config?: NotificationTemplateModuleConfig): Provider[] {
        const providers: Provider[] = [];

        // Provider de configuration par défaut
        if (config?.defaultConfig) {
            providers.push({
                provide: TEMPLATE_CONFIG_TOKEN,
                useValue: config.defaultConfig
            });
        }

        // Providers de templates
        if (config?.providers) {
            config.providers.forEach(provider => {
                providers.push(this.createProviderWithConfig(provider, config.providerConfigs?.get(provider)));
            });
        }

        // Providers utilitaires
        providers.push(
            HandlebarsEngine,
            SimpleEngine,
            FileTemplateLoader,
            FunctionTemplateLoader
        );

        return providers;
    }

    /**
     * Créer les providers pour la configuration asynchrone
     */
    private static createAsyncProviders(options: {
        useFactory?: (...args: any[]) => Promise<NotificationTemplateModuleConfig> | NotificationTemplateModuleConfig;
        inject?: any[];
    }): Provider[] {
        const providers: Provider[] = [];

        if (options.useFactory) {
            providers.push({
                provide: TEMPLATE_CONFIG_TOKEN,
                useFactory: options.useFactory,
                inject: options.inject || []
            });
        }

        return providers;
    }

    /**
     * Créer un provider avec sa configuration
     */
    private static createProviderWithConfig(
        providerClass: Type<BaseTemplateProvider>,
        customConfig?: TemplateConfigMetadata
    ): Provider {
        return {
            provide: providerClass,
            useFactory: (defaultConfig?: TemplateEngineConfig) => {
                // 1. Configuration du décorateur
                const decoratorConfig = getTemplateConfig(providerClass);
                
                // 2. Configuration personnalisée
                const config = customConfig || decoratorConfig || defaultConfig;
                
                // 3. Créer l'instance avec la configuration
                return new providerClass(config);
            },
            inject: [{ token: TEMPLATE_CONFIG_TOKEN, optional: true }]
        };
    }

    /**
     * Utilitaires pour créer des configurations rapides
     */
    static configurations = {
        /**
         * Configuration pour les emails avec Handlebars
         */
        email: (templatesPath: string): NotificationTemplateModuleConfig => ({
            defaultConfig: {
                engine: 'handlebars',
                templatesPath,
                templateExtension: '.hbs',
                enableCache: true,
                cacheTtl: 300000
            }
        }),

        /**
         * Configuration pour les SMS/Telegram avec des fonctions
         */
        sms: (): NotificationTemplateModuleConfig => ({
            defaultConfig: {
                engine: 'simple',
                enableCache: false
            }
        }),

        /**
         * Configuration pour les webhooks avec templates JSON
         */
        webhook: (templatesPath: string): NotificationTemplateModuleConfig => ({
            defaultConfig: {
                engine: 'simple',
                templatesPath,
                templateExtension: '.json',
                enableCache: true,
                cacheTtl: 600000 // 10 minutes pour JSON
            }
        }),

        /**
         * Configuration pour le développement
         */
        development: (): NotificationTemplateModuleConfig => ({
            defaultConfig: {
                engine: 'simple',
                enableCache: false,
                templateExtension: '.txt'
            },
            isGlobal: true
        }),

        /**
         * Configuration pour la production
         */
        production: (templatesPath: string): NotificationTemplateModuleConfig => ({
            defaultConfig: {
                engine: 'handlebars',
                templatesPath,
                templateExtension: '.hbs',
                enableCache: true,
                cacheTtl: 600000 // 10 minutes
            },
            isGlobal: true
        })
    };
}

/**
 * Service utilitaire pour la gestion des templates
 */
export class TemplateService {
    private providers = new Map<string, BaseTemplateProvider>();

    /**
     * Enregistre un provider de template
     */
    registerProvider(name: string, provider: BaseTemplateProvider): void {
        this.providers.set(name, provider);
    }

    /**
     * Récupère un provider par nom
     */
    getProvider(name: string): BaseTemplateProvider | undefined {
        return this.providers.get(name);
    }

    /**
     * Rend un template avec un provider spécifique
     */
    async render(providerName: string, eventType: string, payload: any, context: any): Promise<string> {
        const provider = this.getProvider(providerName);
        if (!provider) {
            throw new Error(`Template provider '${providerName}' not found`);
        }

        return provider.render(eventType, payload, context);
    }

    /**
     * Liste tous les providers disponibles
     */
    getAvailableProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Retourne les statistiques de tous les providers
     */
    getAllStats(): Record<string, any> {
        const stats: Record<string, any> = {};
        
        this.providers.forEach((provider, name) => {
            stats[name] = provider.getTemplateStats();
        });

        return stats;
    }
}

/**
 * Factory pour créer rapidement un module de template
 */
export class TemplateModuleFactory {
    
    /**
     * Crée un module pour les emails
     */
    static createEmailModule(templatesPath: string, providers: Type<BaseTemplateProvider>[] = []): DynamicModule {
        return NotificationTemplateModule.forRoot({
            ...NotificationTemplateModule.configurations.email(templatesPath),
            providers
        });
    }

    /**
     * Crée un module pour les SMS/messages courts
     */
    static createSmsModule(providers: Type<BaseTemplateProvider>[] = []): DynamicModule {
        return NotificationTemplateModule.forRoot({
            ...NotificationTemplateModule.configurations.sms(),
            providers
        });
    }

    /**
     * Crée un module pour les webhooks
     */
    static createWebhookModule(templatesPath: string, providers: Type<BaseTemplateProvider>[] = []): DynamicModule {
        return NotificationTemplateModule.forRoot({
            ...NotificationTemplateModule.configurations.webhook(templatesPath),
            providers
        });
    }

    /**
     * Crée un module mixte avec plusieurs types de providers
     */
    static createMixedModule(config: {
        emailTemplatesPath?: string;
        webhookTemplatesPath?: string;
        providers: Type<BaseTemplateProvider>[];
    }): DynamicModule {
        const providerConfigs = new Map<Type<BaseTemplateProvider>, TemplateConfigMetadata>();

        // Configuration par défaut simple pour la flexibilité
        const defaultConfig: TemplateEngineConfig = {
            engine: 'simple',
            enableCache: true,
            cacheTtl: 300000
        };

        return NotificationTemplateModule.forRoot({
            defaultConfig,
            providers: config.providers,
            providerConfigs,
            isGlobal: true
        });
    }
}