import { SetMetadata } from '@nestjs/common';
import { TemplateConfigMetadata } from '../interfaces/template-engine.interface';

/**
 * Clé pour les métadonnées de configuration du template
 */
export const TEMPLATE_CONFIG_METADATA_KEY = 'template-config';

/**
 * Décorateur pour configurer un provider de template
 * 
 * @param config Configuration du moteur de template
 * 
 * @example
 * ```typescript
 * @TemplateConfig({
 *   engine: 'handlebars',
 *   templatesPath: './templates',
 *   templateExtension: '.hbs'
 * })
 * export class EmailTemplateProvider extends BaseTemplateProvider {
 *   // ...
 * }
 * ```
 */
export function TemplateConfig(config: TemplateConfigMetadata) {
    return function <T extends new(...args: any[]) => any>(target: T) {
        // Valider la configuration
        const validation = validateTemplateConfig(config);
        if (!validation.isValid) {
            throw new Error(`Invalid template configuration: ${validation.errors.join(', ')}`);
        }

        // Stocker les métadonnées
        SetMetadata(TEMPLATE_CONFIG_METADATA_KEY, config)(target);
        
        return target;
    };
}

/**
 * Récupère la configuration du template depuis les métadonnées d'une classe
 */
export function getTemplateConfig(target: any): TemplateConfigMetadata | undefined {
    return Reflect.getMetadata(TEMPLATE_CONFIG_METADATA_KEY, target);
}

/**
 * Vérifie si une classe a une configuration de template
 */
export function hasTemplateConfig(target: any): boolean {
    return Reflect.hasMetadata(TEMPLATE_CONFIG_METADATA_KEY, target);
}

/**
 * Valide une configuration de template
 */
export function validateTemplateConfig(config: TemplateConfigMetadata): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Vérifier le moteur
    if (!config.engine) {
        errors.push('Template engine is required');
    } else if (!['handlebars', 'mustache', 'simple', 'custom'].includes(config.engine)) {
        errors.push(`Unsupported template engine: ${config.engine}`);
    }

    // Vérifier le chemin des templates (optionnel)
    if (config.templatesPath) {
        if (typeof config.templatesPath !== 'string') {
            errors.push('Templates path must be a string');
        } else if (config.templatesPath.trim() === '') {
            errors.push('Templates path cannot be empty');
        }
    }

    // Vérifier l'extension des templates
    if (config.templateExtension) {
        if (typeof config.templateExtension !== 'string') {
            errors.push('Template extension must be a string');
        } else if (!config.templateExtension.startsWith('.')) {
            warnings.push('Template extension should start with a dot (e.g., ".hbs")');
        }
    }

    // Vérifier le cache TTL
    if (config.cacheTtl !== undefined) {
        if (typeof config.cacheTtl !== 'number' || config.cacheTtl < 0) {
            errors.push('Cache TTL must be a positive number');
        } else if (config.cacheTtl < 1000) {
            warnings.push('Cache TTL is very low (< 1 second), consider increasing it');
        }
    }

    // Vérifier les helpers
    if (config.helpers) {
        if (typeof config.helpers !== 'object' || Array.isArray(config.helpers)) {
            errors.push('Helpers must be an object');
        } else {
            Object.entries(config.helpers).forEach(([name, helper]) => {
                if (typeof name !== 'string' || name.trim() === '') {
                    errors.push('Helper names must be non-empty strings');
                }
                if (typeof helper !== 'function') {
                    errors.push(`Helper '${name}' must be a function`);
                }
            });
        }
    }

    // Vérifier les partials
    if (config.partials) {
        if (typeof config.partials !== 'object' || Array.isArray(config.partials)) {
            errors.push('Partials must be an object');
        } else {
            Object.entries(config.partials).forEach(([name, content]) => {
                if (typeof name !== 'string' || name.trim() === '') {
                    errors.push('Partial names must be non-empty strings');
                }
                if (typeof content !== 'string') {
                    errors.push(`Partial '${name}' content must be a string`);
                }
            });
        }
    }

    // Vérifications spécifiques au moteur
    if (config.engine === 'handlebars' && !config.templatesPath) {
        warnings.push('Handlebars engine works better with template files (consider setting templatesPath)');
    }

    if (config.engine === 'simple' && config.templatesPath && config.helpers) {
        warnings.push('Simple engine with both files and helpers might be redundant');
    }

    // Vérifications d'environnement
    if (config.enableCache === false && process.env.NODE_ENV === 'production') {
        warnings.push('Cache is disabled in production environment');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Décorateur factory pour créer des configurations spécifiques
 */
export class TemplateConfigFactory {
    
    /**
     * Configuration pour les templates Handlebars avec fichiers
     */
    static handlebarsFiles(templatesPath: string, options?: Partial<TemplateConfigMetadata>) {
        return TemplateConfig({
            engine: 'handlebars',
            templatesPath,
            templateExtension: '.hbs',
            enableCache: true,
            cacheTtl: 300000, // 5 minutes
            ...options
        });
    }

    /**
     * Configuration pour les templates simples avec fichiers
     */
    static simpleFiles(templatesPath: string, options?: Partial<TemplateConfigMetadata>) {
        return TemplateConfig({
            engine: 'simple',
            templatesPath,
            templateExtension: '.txt',
            enableCache: true,
            cacheTtl: 300000,
            ...options
        });
    }

    /**
     * Configuration pour les templates basés sur des fonctions
     */
    static functions(options?: Partial<TemplateConfigMetadata>) {
        return TemplateConfig({
            engine: 'simple',
            enableCache: false, // Pas de cache nécessaire pour les fonctions
            ...options
        });
    }

    /**
     * Configuration pour le développement (cache désactivé, logs détaillés)
     */
    static development(engine: 'handlebars' | 'simple' = 'simple', templatesPath?: string) {
        return TemplateConfig({
            engine,
            templatesPath,
            enableCache: false, // Pas de cache en développement
            templateExtension: engine === 'handlebars' ? '.hbs' : '.txt'
        });
    }

    /**
     * Configuration pour la production (cache activé, optimisé)
     */
    static production(engine: 'handlebars' | 'simple', templatesPath: string) {
        return TemplateConfig({
            engine,
            templatesPath,
            enableCache: true,
            cacheTtl: 600000, // 10 minutes en production
            templateExtension: engine === 'handlebars' ? '.hbs' : '.txt'
        });
    }
}

/**
 * Décorateur pour marquer une méthode comme helper de template
 */
export function TemplateHelper(name?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const helperName = name || propertyKey;
        
        // Stocker les métadonnées du helper
        const existingHelpers = Reflect.getMetadata('template-helpers', target.constructor) || [];
        existingHelpers.push({
            name: helperName,
            method: propertyKey,
            function: descriptor.value
        });
        
        Reflect.defineMetadata('template-helpers', existingHelpers, target.constructor);
    };
}

/**
 * Récupère tous les helpers définis dans une classe
 */
export function getTemplateHelpers(target: any): Array<{name: string, method: string, function: Function}> {
    return Reflect.getMetadata('template-helpers', target) || [];
}

/**
 * Utilitaire pour créer une configuration complète avec validation
 */
export function createTemplateConfig(config: Partial<TemplateConfigMetadata>): TemplateConfigMetadata {
    const defaultConfig: TemplateConfigMetadata = {
        engine: 'simple',
        enableCache: true,
        cacheTtl: 300000,
        templateExtension: '.txt'
    };

    const mergedConfig = { ...defaultConfig, ...config };
    
    const validation = validateTemplateConfig(mergedConfig);
    if (!validation.isValid) {
        throw new Error(`Invalid template configuration: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
        console.warn('Template configuration warnings:', validation.warnings);
    }

    return mergedConfig;
}