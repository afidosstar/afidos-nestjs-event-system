import { NotificationContext } from '../../types/interfaces';

/**
 * Interface pour l'enrichissement des données avant le rendu
 */
export interface DataEnricher<TPayload = any, TEnriched = any> {
    /**
     * Enrichit les données du payload avec des informations supplémentaires
     * @param payload Données originales de l'événement
     * @param context Contexte de la notification
     * @returns Données enrichies pour le rendu
     */
    enrichData(payload: TPayload, context: NotificationContext): Promise<TEnriched>;
}

/**
 * Interface pour le rendu des templates
 */
export interface TemplateRenderer {
    /**
     * Rend un template avec les données fournies
     * @param templateName Nom du template
     * @param data Données pour le rendu
     * @returns Contenu rendu
     */
    render(templateName: string, data: any): Promise<string>;

    /**
     * Enregistre un helper pour le moteur de template
     * @param name Nom du helper
     * @param helper Fonction helper
     */
    registerHelper(name: string, helper: Function): void;

    /**
     * Enregistre un partial pour le moteur de template
     * @param name Nom du partial
     * @param content Contenu du partial
     */
    registerPartial?(name: string, content: string): void;
}

/**
 * Interface pour le chargement des templates
 */
export interface TemplateLoader {
    /**
     * Charge un template par son nom
     * @param templateName Nom du template
     * @returns Contenu du template
     */
    load(templateName: string): Promise<string>;

    /**
     * Vérifie si un template existe
     * @param templateName Nom du template
     * @returns True si le template existe
     */
    exists(templateName: string): Promise<boolean>;

    /**
     * Liste tous les templates disponibles
     * @returns Liste des noms de templates
     */
    list(): Promise<string[]>;
}

/**
 * Configuration du moteur de template
 */
export interface TemplateEngineConfig {
    /** Type de moteur de rendu */
    engine: 'handlebars' | 'mustache' | 'simple' | 'custom';
    
    /** Chemin vers les templates (optionnel si rendu par fonction) */
    templatesPath?: string;
    
    /** Template par défaut à utiliser */
    defaultTemplate?: string;
    
    /** Extension des fichiers de template */
    templateExtension?: string;
    
    /** Helpers personnalisés */
    helpers?: Record<string, Function>;
    
    /** Partials personnalisés */
    partials?: Record<string, string>;
    
    /** Options spécifiques au moteur */
    engineOptions?: Record<string, any>;
    
    /** Cache activé */
    enableCache?: boolean;
    
    /** Durée du cache en millisecondes */
    cacheTtl?: number;
}

/**
 * Interface principale pour un provider de template
 */
export interface TemplateProvider<TPayload = any, TEnriched = any> extends DataEnricher<TPayload, TEnriched> {
    /**
     * Rend un template pour un type d'événement donné
     * @param eventType Type d'événement
     * @param enrichedData Données enrichies
     * @returns Contenu rendu
     */
    renderTemplate(eventType: string, enrichedData: TEnriched): Promise<string>;

    /**
     * Méthode principale pour rendre un template
     * @param eventType Type d'événement
     * @param payload Données originales
     * @param context Contexte de notification
     * @returns Contenu rendu
     */
    render(eventType: string, payload: TPayload, context: NotificationContext): Promise<string>;
}

/**
 * Métadonnées pour la configuration du template
 */
export interface TemplateConfigMetadata extends TemplateEngineConfig {
    /** Nom du provider (optionnel) */
    providerName?: string;
}

/**
 * Interface pour les métriques du template engine
 */
export interface TemplateMetrics {
    /** Nombre de rendus effectués */
    renderCount: number;
    
    /** Temps moyen de rendu en ms */
    averageRenderTime: number;
    
    /** Nombre d'erreurs de rendu */
    errorCount: number;
    
    /** Taille du cache */
    cacheSize: number;
    
    /** Taux de hit du cache */
    cacheHitRate: number;
    
    /** Dernière utilisation */
    lastUsed: Date;
}

/**
 * Interface pour la validation des templates
 */
export interface TemplateValidator {
    /**
     * Valide un template
     * @param templateContent Contenu du template
     * @param templateName Nom du template
     * @returns Résultat de validation
     */
    validate(templateContent: string, templateName?: string): Promise<TemplateValidationResult>;
}

/**
 * Résultat de validation d'un template
 */
export interface TemplateValidationResult {
    /** Template valide */
    isValid: boolean;
    
    /** Erreurs de validation */
    errors: TemplateValidationError[];
    
    /** Avertissements */
    warnings: TemplateValidationWarning[];
    
    /** Variables détectées dans le template */
    variables: string[];
    
    /** Helpers utilisés */
    helpers: string[];
}

/**
 * Erreur de validation
 */
export interface TemplateValidationError {
    /** Type d'erreur */
    type: 'syntax' | 'variable' | 'helper' | 'partial';
    
    /** Message d'erreur */
    message: string;
    
    /** Ligne de l'erreur */
    line?: number;
    
    /** Colonne de l'erreur */
    column?: number;
}

/**
 * Avertissement de validation
 */
export interface TemplateValidationWarning {
    /** Type d'avertissement */
    type: 'unused_variable' | 'missing_helper' | 'performance' | 'accessibility';
    
    /** Message d'avertissement */
    message: string;
    
    /** Ligne de l'avertissement */
    line?: number;
}