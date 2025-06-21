import { Injectable, Logger } from '@nestjs/common';
import { TemplateRenderer, TemplateEngineConfig } from '../interfaces/template-engine.interface';

/**
 * Moteur de rendu simple (substitution de variables)
 * Supporte les variables {{variable}} et les conditions simples {{#if condition}}...{{/if}}
 */
@Injectable()
export class SimpleEngine implements TemplateRenderer {
    private readonly logger = new Logger(SimpleEngine.name);
    private helpers: Map<string, Function> = new Map();

    constructor(private readonly config: TemplateEngineConfig) {
        this.initializeHelpers();
    }

    /**
     * Initialise les helpers par défaut et personnalisés
     */
    private initializeHelpers(): void {
        // Enregistrer les helpers par défaut
        Object.entries(SimpleEngine.getDefaultHelpers()).forEach(([name, helper]) => {
            this.registerHelper(name, helper);
        });

        // Enregistrer les helpers personnalisés
        if (this.config.helpers) {
            Object.entries(this.config.helpers).forEach(([name, helper]) => {
                this.registerHelper(name, helper);
            });
        }

        this.logger.log('Simple engine initialized with helpers');
    }

    /**
     * Rend un template avec les données
     */
    async render(templateContent: string, data: any): Promise<string> {
        try {
            let rendered = templateContent;

            // 1. Traiter les conditions {{#if variable}}...{{/if}}
            rendered = this.processConditions(rendered, data);

            // 2. Traiter les boucles {{#each array}}...{{/each}}
            rendered = this.processLoops(rendered, data);

            // 3. Traiter les helpers {{helper param1 param2}}
            rendered = this.processHelpers(rendered, data);

            // 4. Remplacer les variables simples {{variable}} et {{object.property}}
            rendered = this.processVariables(rendered, data);

            return rendered;
        } catch (error) {
            this.logger.error(`Simple engine render error: ${error.message}`);
            throw new Error(`Template render failed: ${error.message}`);
        }
    }

    /**
     * Traite les conditions dans le template
     */
    private processConditions(template: string, data: any): string {
        return template.replace(/\{\{#if\s+(\w+(?:\.\w+)*)\}\}(.*?)\{\{\/if\}\}/gs, (match, path, content) => {
            const value = this.getNestedValue(data, path);
            return this.isTruthy(value) ? content : '';
        });
    }

    /**
     * Traite les boucles dans le template
     */
    private processLoops(template: string, data: any): string {
        return template.replace(/\{\{#each\s+(\w+(?:\.\w+)*)\}\}(.*?)\{\{\/each\}\}/gs, (match, path, content) => {
            const array = this.getNestedValue(data, path);
            
            if (!Array.isArray(array)) {
                return '';
            }

            return array.map((item, index) => {
                const itemData = {
                    ...data,
                    this: item,
                    '@index': index,
                    '@first': index === 0,
                    '@last': index === array.length - 1,
                    '@length': array.length
                };
                
                return this.processVariables(content, itemData);
            }).join('');
        });
    }

    /**
     * Traite les helpers dans le template
     */
    private processHelpers(template: string, data: any): string {
        return template.replace(/\{\{(\w+)\s+([^}]+)\}\}/g, (match, helperName, params) => {
            const helper = this.helpers.get(helperName);
            
            if (!helper) {
                this.logger.warn(`Helper '${helperName}' not found`);
                return match;
            }

            try {
                // Parser les paramètres
                const parsedParams = this.parseParams(params, data);
                return helper.apply(data, parsedParams);
            } catch (error) {
                this.logger.error(`Helper '${helperName}' execution error: ${error.message}`);
                return match;
            }
        });
    }

    /**
     * Traite les variables dans le template
     */
    private processVariables(template: string, data: any): string {
        return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
            const value = this.getNestedValue(data, path);
            
            if (value === undefined || value === null) {
                return '';
            }
            
            if (typeof value === 'object') {
                return JSON.stringify(value);
            }
            
            return String(value);
        });
    }

    /**
     * Parse les paramètres d'un helper
     */
    private parseParams(paramsStr: string, data: any): any[] {
        const params: any[] = [];
        const regex = /"([^"]*)"|'([^']*)'|(\w+(?:\.\w+)*)|(\d+(?:\.\d+)?)/g;
        let match;

        while ((match = regex.exec(paramsStr)) !== null) {
            if (match[1] !== undefined) {
                // String avec guillemets doubles
                params.push(match[1]);
            } else if (match[2] !== undefined) {
                // String avec guillemets simples
                params.push(match[2]);
            } else if (match[3] !== undefined) {
                // Variable ou chemin d'objet
                params.push(this.getNestedValue(data, match[3]));
            } else if (match[4] !== undefined) {
                // Nombre
                params.push(parseFloat(match[4]));
            }
        }

        return params;
    }

    /**
     * Récupère une valeur imbriquée dans un objet
     */
    private getNestedValue(obj: any, path: string): any {
        if (!path) return obj;
        
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Vérifie si une valeur est "truthy"
     */
    private isTruthy(value: any): boolean {
        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') return value.length > 0;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return Boolean(value);
    }

    /**
     * Enregistre un helper
     */
    registerHelper(name: string, helper: Function): void {
        this.helpers.set(name, helper);
        this.logger.debug(`Helper '${name}' registered`);
    }

    /**
     * Supprime un helper
     */
    unregisterHelper(name: string): void {
        this.helpers.delete(name);
        this.logger.debug(`Helper '${name}' unregistered`);
    }

    /**
     * Liste tous les helpers disponibles
     */
    getAvailableHelpers(): string[] {
        return Array.from(this.helpers.keys());
    }

    /**
     * Valide la syntaxe d'un template
     */
    validate(templateContent: string): { isValid: boolean; error?: string } {
        try {
            // Vérifier les balises fermantes
            const openIf = (templateContent.match(/\{\{#if\s+\w+\}\}/g) || []).length;
            const closeIf = (templateContent.match(/\{\{\/if\}\}/g) || []).length;
            
            if (openIf !== closeIf) {
                return { isValid: false, error: 'Mismatched {{#if}} and {{/if}} tags' };
            }

            const openEach = (templateContent.match(/\{\{#each\s+\w+\}\}/g) || []).length;
            const closeEach = (templateContent.match(/\{\{\/each\}\}/g) || []).length;
            
            if (openEach !== closeEach) {
                return { isValid: false, error: 'Mismatched {{#each}} and {{/each}} tags' };
            }

            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: error.message };
        }
    }

    /**
     * Helpers par défaut pour le moteur simple
     */
    static getDefaultHelpers(): Record<string, Function> {
        return {
            // Formatter une date
            formatDate: function(date: string | Date, format?: string) {
                if (!date) return '';
                const dateObj = typeof date === 'string' ? new Date(date) : date;
                if (isNaN(dateObj.getTime())) return '';
                
                if (format === 'short') {
                    return dateObj.toLocaleDateString('fr-FR');
                }
                return dateObj.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            },

            // Formatter un prix
            formatPrice: function(price: number | string, currency: string = '€') {
                if (!price) return '0,00' + currency;
                const numPrice = typeof price === 'string' ? parseFloat(price) : price;
                if (isNaN(numPrice)) return '0,00' + currency;
                
                return numPrice.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }) + currency;
            },

            // Capitaliser une chaîne
            capitalize: function(str: string) {
                if (!str) return '';
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            },

            // Majuscules
            uppercase: function(str: string) {
                return str ? str.toUpperCase() : '';
            },

            // Minuscules
            lowercase: function(str: string) {
                return str ? str.toLowerCase() : '';
            },

            // Tronquer du texte
            truncate: function(str: string, length: number = 100) {
                if (!str) return '';
                if (str.length <= length) return str;
                return str.substring(0, length) + '...';
            },

            // Créer une URL
            url: function(path: string, baseUrl?: string) {
                const base = baseUrl || process.env.APP_URL || 'http://localhost:3000';
                return base + (path.startsWith('/') ? path : '/' + path);
            },

            // Échapper HTML
            escape: function(str: string) {
                if (!str) return '';
                return str
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#x27;');
            },

            // Répéter une chaîne
            repeat: function(str: string, times: number) {
                if (!str || !times) return '';
                return str.repeat(times);
            },

            // Joindre un tableau
            join: function(array: any[], separator: string = ', ') {
                if (!Array.isArray(array)) return '';
                return array.join(separator);
            },

            // Longueur d'un tableau ou d'une chaîne
            length: function(value: any[] | string) {
                if (!value) return 0;
                return value.length;
            }
        };
    }
}