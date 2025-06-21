import { Injectable, Logger } from '@nestjs/common';
import { TemplateLoader } from '../interfaces/template-engine.interface';

/**
 * Type pour les fonctions de template
 */
export type TemplateFunctionMap = Record<string, (data: any) => string>;

/**
 * Loader pour les templates définis comme des fonctions
 */
@Injectable()
export class FunctionTemplateLoader implements TemplateLoader {
    private readonly logger = new Logger(FunctionTemplateLoader.name);
    private readonly templates = new Map<string, (data: any) => string>();

    constructor() {
        this.logger.log('FunctionTemplateLoader initialized');
    }

    /**
     * Enregistre une fonction de template
     */
    registerTemplate(name: string, templateFunction: (data: any) => string): void {
        this.templates.set(name, templateFunction);
        this.logger.debug(`Template function '${name}' registered`);
    }

    /**
     * Enregistre plusieurs fonctions de template
     */
    registerTemplates(templates: TemplateFunctionMap): void {
        Object.entries(templates).forEach(([name, fn]) => {
            this.registerTemplate(name, fn);
        });
        this.logger.log(`Registered ${Object.keys(templates).length} template functions`);
    }

    /**
     * Supprime une fonction de template
     */
    unregisterTemplate(name: string): void {
        const removed = this.templates.delete(name);
        if (removed) {
            this.logger.debug(`Template function '${name}' unregistered`);
        }
    }

    /**
     * Charge un template (exécute la fonction avec les données)
     */
    async load(templateName: string): Promise<string> {
        const templateFunction = this.templates.get(templateName);
        
        if (!templateFunction) {
            throw new Error(`Template function '${templateName}' not found`);
        }

        // Pour le FunctionTemplateLoader, on ne peut pas "charger" sans données
        // Cette méthode retourne une représentation de la fonction
        return `[Function: ${templateName}]`;
    }

    /**
     * Exécute une fonction de template avec les données
     */
    async render(templateName: string, data: any): Promise<string> {
        const templateFunction = this.templates.get(templateName);
        
        if (!templateFunction) {
            throw new Error(`Template function '${templateName}' not found`);
        }

        try {
            const result = templateFunction(data);
            this.logger.debug(`Template function '${templateName}' executed successfully`);
            return result;
        } catch (error) {
            this.logger.error(`Template function '${templateName}' execution failed: ${error.message}`);
            throw new Error(`Template function '${templateName}' execution failed: ${error.message}`);
        }
    }

    /**
     * Vérifie si une fonction de template existe
     */
    async exists(templateName: string): Promise<boolean> {
        return this.templates.has(templateName);
    }

    /**
     * Liste toutes les fonctions de template disponibles
     */
    async list(): Promise<string[]> {
        return Array.from(this.templates.keys());
    }

    /**
     * Retourne le nombre de templates enregistrés
     */
    getTemplateCount(): number {
        return this.templates.size;
    }

    /**
     * Vide tous les templates
     */
    clear(): void {
        const count = this.templates.size;
        this.templates.clear();
        this.logger.log(`Cleared ${count} template functions`);
    }

    /**
     * Retourne les statistiques
     */
    getStats(): { count: number; templates: string[] } {
        return {
            count: this.templates.size,
            templates: Array.from(this.templates.keys())
        };
    }

    /**
     * Valide qu'une fonction de template est correctement définie
     */
    validateTemplate(name: string, testData?: any): { isValid: boolean; error?: string } {
        const templateFunction = this.templates.get(name);
        
        if (!templateFunction) {
            return { isValid: false, error: `Template function '${name}' not found` };
        }

        if (typeof templateFunction !== 'function') {
            return { isValid: false, error: `Template '${name}' is not a function` };
        }

        // Test optionnel avec des données de test
        if (testData) {
            try {
                const result = templateFunction(testData);
                if (typeof result !== 'string') {
                    return { isValid: false, error: `Template function '${name}' must return a string` };
                }
            } catch (error) {
                return { isValid: false, error: `Template function '${name}' throws error: ${error.message}` };
            }
        }

        return { isValid: true };
    }

    /**
     * Crée des fonctions de template par défaut pour tester
     */
    static getDefaultTemplates(): TemplateFunctionMap {
        return {
            'default': (data: any) => {
                return `Default template with data: ${JSON.stringify(data, null, 2)}`;
            },

            'user.created': (data: any) => {
                return `Bienvenue ${data.firstName || data.name || 'Utilisateur'} !
Votre compte a été créé avec succès.
${data.email ? `Email: ${data.email}` : ''}
${data.appUrl ? `Accédez à votre profil: ${data.appUrl}/profile` : ''}`;
            },

            'order.created': (data: any) => {
                return `Nouvelle commande #${data.id || 'N/A'}
${data.total ? `Total: ${data.total}€` : ''}
${data.customer?.name ? `Client: ${data.customer.name}` : ''}
${data.appUrl ? `Voir la commande: ${data.appUrl}/orders/${data.id}` : ''}`;
            },

            'order.shipped': (data: any) => {
                return `Commande #${data.id || 'N/A'} expédiée
${data.trackingNumber ? `Numéro de suivi: ${data.trackingNumber}` : ''}
${data.estimatedDelivery ? `Livraison estimée: ${data.estimatedDelivery} jours` : ''}`;
            },

            'system.error': (data: any) => {
                return `Erreur système détectée
Message: ${data.error || data.message || 'Erreur inconnue'}
${data.timestamp ? `Heure: ${new Date(data.timestamp).toLocaleString('fr-FR')}` : ''}
${data.component ? `Composant: ${data.component}` : ''}`;
            },

            'system.maintenance': (data: any) => {
                return `Maintenance programmée
${data.message || 'Maintenance en cours'}
${data.duration ? `Durée estimée: ${data.duration}` : ''}
${data.startTime ? `Début: ${new Date(data.startTime).toLocaleString('fr-FR')}` : ''}`;
            },

            'simple-html': (data: any) => {
                return `<!DOCTYPE html>
<html>
<head>
    <title>${data.title || 'Notification'}</title>
</head>
<body>
    <h1>${data.title || 'Notification'}</h1>
    <p>${data.message || 'Message par défaut'}</p>
    ${data.action ? `<a href="${data.action.url}">${data.action.text}</a>` : ''}
</body>
</html>`;
            },

            'json-webhook': (data: any) => {
                return JSON.stringify({
                    event: {
                        type: data.eventType || 'unknown',
                        timestamp: data.timestamp || new Date().toISOString(),
                        id: data.eventId || 'unknown'
                    },
                    data: data,
                    meta: {
                        source: 'function-template',
                        version: '1.0'
                    }
                }, null, 2);
            }
        };
    }

    /**
     * Initialise avec les templates par défaut
     */
    initializeWithDefaults(): void {
        this.registerTemplates(FunctionTemplateLoader.getDefaultTemplates());
        this.logger.log('Initialized with default template functions');
    }
}