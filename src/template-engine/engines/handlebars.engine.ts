import { Injectable, Logger } from '@nestjs/common';
import { TemplateRenderer, TemplateEngineConfig } from '../interfaces/template-engine.interface';

/**
 * Moteur de rendu Handlebars
 */
@Injectable()
export class HandlebarsEngine implements TemplateRenderer {
    private readonly logger = new Logger(HandlebarsEngine.name);
    private handlebars: any;
    private initialized = false;

    constructor(private readonly config: TemplateEngineConfig) {
        this.initializeHandlebars();
    }

    /**
     * Initialise Handlebars avec la configuration
     */
    private async initializeHandlebars(): Promise<void> {
        try {
            // Import dynamique de handlebars
            this.handlebars = await import('handlebars');
            
            // Enregistrer les helpers personnalisés
            if (this.config.helpers) {
                Object.entries(this.config.helpers).forEach(([name, helper]) => {
                    this.registerHelper(name, helper);
                });
            }

            // Enregistrer les partials personnalisés
            if (this.config.partials) {
                Object.entries(this.config.partials).forEach(([name, content]) => {
                    this.registerPartial(name, content);
                });
            }

            // Configurer les options Handlebars
            if (this.config.engineOptions) {
                Object.entries(this.config.engineOptions).forEach(([key, value]) => {
                    this.handlebars[key] = value;
                });
            }

            this.initialized = true;
            this.logger.log('Handlebars engine initialized successfully');
        } catch (error) {
            this.logger.error(`Failed to initialize Handlebars: ${error.message}`);
            throw new Error(`Handlebars initialization failed: ${error.message}`);
        }
    }

    /**
     * Rend un template avec les données
     */
    async render(templateContent: string, data: any): Promise<string> {
        if (!this.initialized) {
            await this.initializeHandlebars();
        }

        try {
            const template = this.handlebars.compile(templateContent);
            return template(data);
        } catch (error) {
            this.logger.error(`Handlebars render error: ${error.message}`);
            throw new Error(`Template render failed: ${error.message}`);
        }
    }

    /**
     * Enregistre un helper
     */
    registerHelper(name: string, helper: Function): void {
        if (!this.handlebars) {
            this.logger.warn(`Cannot register helper '${name}' - Handlebars not initialized`);
            return;
        }

        try {
            this.handlebars.registerHelper(name, helper);
            this.logger.debug(`Helper '${name}' registered successfully`);
        } catch (error) {
            this.logger.error(`Failed to register helper '${name}': ${error.message}`);
        }
    }

    /**
     * Enregistre un partial
     */
    registerPartial(name: string, content: string): void {
        if (!this.handlebars) {
            this.logger.warn(`Cannot register partial '${name}' - Handlebars not initialized`);
            return;
        }

        try {
            this.handlebars.registerPartial(name, content);
            this.logger.debug(`Partial '${name}' registered successfully`);
        } catch (error) {
            this.logger.error(`Failed to register partial '${name}': ${error.message}`);
        }
    }

    /**
     * Pré-compile un template pour de meilleures performances
     */
    precompile(templateContent: string): any {
        if (!this.handlebars) {
            throw new Error('Handlebars not initialized');
        }

        return this.handlebars.compile(templateContent);
    }

    /**
     * Valide la syntaxe d'un template
     */
    validate(templateContent: string): { isValid: boolean; error?: string } {
        if (!this.handlebars) {
            return { isValid: false, error: 'Handlebars not initialized' };
        }

        try {
            this.handlebars.compile(templateContent);
            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }

    /**
     * Helpers par défaut pour Handlebars
     */
    static getDefaultHelpers(): Record<string, Function> {
        return {
            // Helper conditionnel amélioré
            ifEquals: function(a: any, b: any, options: any) {
                return a === b ? options.fn(this) : options.inverse(this);
            },

            // Helper pour formatter les dates
            formatDate: function(date: string | Date, format: string = 'fr-FR') {
                if (!date) return '';
                const dateObj = typeof date === 'string' ? new Date(date) : date;
                return dateObj.toLocaleDateString(format);
            },

            // Helper pour formatter les prix
            formatPrice: function(price: number | string, currency: string = '€') {
                if (!price) return '0,00' + currency;
                const numPrice = typeof price === 'string' ? parseFloat(price) : price;
                return numPrice.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }) + currency;
            },

            // Helper pour capitaliser
            capitalize: function(str: string) {
                if (!str) return '';
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            },

            // Helper pour tronquer du texte
            truncate: function(str: string, length: number = 100) {
                if (!str) return '';
                if (str.length <= length) return str;
                return str.substring(0, length) + '...';
            },

            // Helper pour les URLs
            url: function(path: string, baseUrl?: string) {
                const base = baseUrl || process.env.APP_URL || 'http://localhost:3000';
                return base + (path.startsWith('/') ? path : '/' + path);
            },

            // Helper pour JSON pretty print
            json: function(obj: any) {
                return JSON.stringify(obj, null, 2);
            },

            // Helper pour les boucles avec index
            eachWithIndex: function(array: any[], options: any) {
                if (!Array.isArray(array)) return '';
                
                return array.map((item, index) => {
                    return options.fn({ ...item, index, isFirst: index === 0, isLast: index === array.length - 1 });
                }).join('');
            },

            // Helper pour vérifier si une valeur est dans un tableau
            includes: function(array: any[], value: any, options: any) {
                if (!Array.isArray(array)) return options.inverse(this);
                return array.includes(value) ? options.fn(this) : options.inverse(this);
            },

            // Helper pour comparer des nombres
            compare: function(a: number, operator: string, b: number, options: any) {
                const operators = {
                    '==': (a: number, b: number) => a == b,
                    '===': (a: number, b: number) => a === b,
                    '!=': (a: number, b: number) => a != b,
                    '!==': (a: number, b: number) => a !== b,
                    '<': (a: number, b: number) => a < b,
                    '<=': (a: number, b: number) => a <= b,
                    '>': (a: number, b: number) => a > b,
                    '>=': (a: number, b: number) => a >= b,
                };

                const fn = operators[operator as keyof typeof operators];
                if (!fn) return options.inverse(this);
                
                return fn(a, b) ? options.fn(this) : options.inverse(this);
            }
        };
    }
}