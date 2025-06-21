import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { 
    TemplateProvider, 
    TemplateRenderer, 
    TemplateLoader,
    TemplateEngineConfig,
    TemplateConfigMetadata
} from '../interfaces/template-engine.interface';
import { NotificationContext } from '../../types/interfaces';
import { HandlebarsEngine } from '../engines/handlebars.engine';
import { SimpleEngine } from '../engines/simple.engine';
import { FileTemplateLoader } from '../loaders/file-template.loader';
import { FunctionTemplateLoader } from '../loaders/function-template.loader';

/**
 * Token pour injecter la configuration du template
 */
export const TEMPLATE_CONFIG_TOKEN = Symbol('TEMPLATE_CONFIG');

/**
 * Classe de base pour tous les providers de template
 * Gère automatiquement l'enrichissement des données et délègue le rendu
 */
@Injectable()
export abstract class BaseTemplateProvider<TPayload = any, TEnriched = any> 
    implements TemplateProvider<TPayload, TEnriched> {
    
    protected readonly logger = new Logger(this.constructor.name);
    protected templateEngine: TemplateRenderer;
    protected templateLoader: TemplateLoader;
    protected config: TemplateEngineConfig;

    constructor(
        @Optional() @Inject(TEMPLATE_CONFIG_TOKEN) config?: TemplateConfigMetadata
    ) {
        // Utiliser la configuration injectée ou celle du décorateur
        this.config = config || this.getConfigFromMetadata() || this.getDefaultConfig();
        
        this.initializeTemplateEngine();
        this.initializeTemplateLoader();
        
        this.logger.log(`${this.constructor.name} initialized with engine: ${this.config.engine}`);
    }

    /**
     * Méthode abstraite que chaque provider doit implémenter pour enrichir les données
     */
    abstract enrichData(payload: TPayload, context: NotificationContext): Promise<TEnriched>;

    /**
     * Méthode abstraite que chaque provider doit implémenter pour le rendu
     */
    abstract renderTemplate(eventType: string, enrichedData: TEnriched): Promise<string>;

    /**
     * Méthode principale qui gère automatiquement l'enrichissement
     */
    async render(eventType: string, payload: TPayload, context: NotificationContext): Promise<string> {
        const startTime = Date.now();
        
        try {
            // 1. Enrichir les données automatiquement
            this.logger.debug(`Enriching data for event: ${eventType}`);
            const enrichedData = await this.enrichData(payload, context);

            // 2. Déléguer le rendu au provider spécifique
            this.logger.debug(`Rendering template for event: ${eventType}`);
            const result = await this.renderTemplate(eventType, enrichedData);

            const duration = Date.now() - startTime;
            this.logger.debug(`Template rendered successfully in ${duration}ms for event: ${eventType}`);
            
            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Template rendering failed after ${duration}ms for event ${eventType}: ${error.message}`);
            throw new Error(`Template rendering failed for event '${eventType}': ${error.message}`);
        }
    }

    /**
     * Rendu par fichier template (pour les providers qui utilisent des fichiers)
     */
    protected async renderFromFile(eventType: string, enrichedData: TEnriched): Promise<string> {
        if (!this.templateLoader) {
            throw new Error('Template loader not configured for file-based rendering');
        }

        try {
            // Vérifier si le template existe
            const templateExists = await this.templateLoader.exists(eventType);
            if (!templateExists) {
                throw new Error(`Template file '${eventType}' not found`);
            }

            // Charger le contenu du template
            const templateContent = await this.templateLoader.load(eventType);
            
            // Rendre avec le moteur de template
            return await this.templateEngine.render(templateContent, enrichedData);

        } catch (error) {
            this.logger.error(`File template rendering failed for '${eventType}': ${error.message}`);
            throw error;
        }
    }

    /**
     * Rendu par fonction (pour les providers qui utilisent des fonctions)
     */
    protected async renderFromFunction(eventType: string, enrichedData: TEnriched): Promise<string> {
        if (!(this.templateLoader instanceof FunctionTemplateLoader)) {
            throw new Error('Function template loader not configured for function-based rendering');
        }

        try {
            return await this.templateLoader.render(eventType, enrichedData);
        } catch (error) {
            this.logger.error(`Function template rendering failed for '${eventType}': ${error.message}`);
            throw error;
        }
    }

    /**
     * Vérifie si un template existe
     */
    async hasTemplate(eventType: string): Promise<boolean> {
        if (!this.templateLoader) {
            return false;
        }
        
        return await this.templateLoader.exists(eventType);
    }

    /**
     * Liste tous les templates disponibles
     */
    async getAvailableTemplates(): Promise<string[]> {
        if (!this.templateLoader) {
            return [];
        }
        
        return await this.templateLoader.list();
    }

    /**
     * Recharge un template (si supporté)
     */
    async reloadTemplate(eventType: string): Promise<void> {
        if (this.templateLoader instanceof FileTemplateLoader) {
            await this.templateLoader.reload(eventType);
            this.logger.log(`Template '${eventType}' reloaded`);
        } else {
            this.logger.warn(`Template reloading not supported for current loader type`);
        }
    }

    /**
     * Vide le cache des templates
     */
    clearTemplateCache(): void {
        if (this.templateLoader instanceof FileTemplateLoader) {
            this.templateLoader.clearCache();
        } else if (this.templateLoader instanceof FunctionTemplateLoader) {
            // Pour FunctionTemplateLoader, pas vraiment de cache à vider
            this.logger.debug('Function templates do not use cache');
        }
        
        this.logger.log('Template cache cleared');
    }

    /**
     * Retourne les métriques du provider (si disponibles)
     */
    getTemplateStats(): any {
        const stats: any = {
            engine: this.config.engine,
            providerName: this.constructor.name
        };

        if (this.templateLoader instanceof FileTemplateLoader) {
            stats.cache = this.templateLoader.getCacheStats();
        } else if (this.templateLoader instanceof FunctionTemplateLoader) {
            stats.functions = this.templateLoader.getStats();
        }

        return stats;
    }

    /**
     * Valide un template
     */
    async validateTemplate(eventType: string, testData?: any): Promise<{ isValid: boolean; error?: string }> {
        try {
            if (this.templateLoader instanceof FunctionTemplateLoader) {
                return this.templateLoader.validateTemplate(eventType, testData);
            }

            // Pour les templates de fichier, essayer de charger et rendre
            if (await this.templateLoader.exists(eventType)) {
                const content = await this.templateLoader.load(eventType);
                
                // Valider avec le moteur de template
                if (this.templateEngine instanceof SimpleEngine) {
                    return this.templateEngine.validate(content);
                } else if (this.templateEngine instanceof HandlebarsEngine) {
                    return this.templateEngine.validate(content);
                }
            }

            return { isValid: false, error: `Template '${eventType}' not found` };

        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }

    /**
     * Initialise le moteur de template selon la configuration
     */
    private initializeTemplateEngine(): void {
        switch (this.config.engine) {
            case 'handlebars':
                this.templateEngine = new HandlebarsEngine(this.config);
                break;
            case 'simple':
                this.templateEngine = new SimpleEngine(this.config);
                break;
            case 'custom':
                // Pour les moteurs personnalisés, le provider doit override cette méthode
                throw new Error('Custom template engine must be initialized by the provider');
            default:
                this.logger.warn(`Unknown template engine '${this.config.engine}', using simple engine`);
                this.templateEngine = new SimpleEngine(this.config);
                break;
        }
    }

    /**
     * Initialise le loader de template selon la configuration
     */
    private initializeTemplateLoader(): void {
        if (this.config.templatesPath) {
            // Mode fichier
            this.templateLoader = new FileTemplateLoader(this.config);
        } else {
            // Mode fonction par défaut
            this.templateLoader = new FunctionTemplateLoader();
            
            // Initialiser avec les templates par défaut si aucun n'est fourni
            (this.templateLoader as FunctionTemplateLoader).initializeWithDefaults();
        }
    }

    /**
     * Récupère la configuration depuis les métadonnées du décorateur
     */
    private getConfigFromMetadata(): TemplateConfigMetadata | null {
        try {
            const metadata = Reflect.getMetadata('template-config', this.constructor);
            return metadata || null;
        } catch {
            return null;
        }
    }

    /**
     * Configuration par défaut
     */
    private getDefaultConfig(): TemplateEngineConfig {
        return {
            engine: 'simple',
            enableCache: true,
            cacheTtl: 300000, // 5 minutes
            templateExtension: '.txt'
        };
    }

    /**
     * Enregistre un helper personnalisé
     */
    protected registerHelper(name: string, helper: Function): void {
        if (this.templateEngine) {
            this.templateEngine.registerHelper(name, helper);
            this.logger.debug(`Helper '${name}' registered`);
        }
    }

    /**
     * Enregistre plusieurs helpers
     */
    protected registerHelpers(helpers: Record<string, Function>): void {
        Object.entries(helpers).forEach(([name, helper]) => {
            this.registerHelper(name, helper);
        });
    }

    /**
     * Méthode utilitaire pour créer des données enrichies de base
     */
    protected createBaseEnrichedData(payload: TPayload, context: NotificationContext): any {
        return {
            ...payload,
            // Informations du contexte
            eventId: context.eventId,
            correlationId: context.correlationId,
            eventType: context.eventType,
            attempt: context.attempt,
            
            // Informations temporelles
            timestamp: new Date().toISOString(),
            currentDate: new Date().toLocaleDateString('fr-FR'),
            currentTime: new Date().toLocaleTimeString('fr-FR'),
            
            // Informations d'environnement
            environment: process.env.NODE_ENV || 'development',
            appUrl: process.env.APP_URL || 'http://localhost:3000',
            
            // Métadonnées additionnelles
            ...context.metadata
        };
    }
}