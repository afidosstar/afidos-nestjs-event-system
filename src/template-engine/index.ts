/**
 * Template Engine pour les notifications
 * 
 * Ce module fournit un cadre complet pour la gestion des templates de notifications
 * avec support de multiples moteurs de rendu et modes de fonctionnement.
 */

// Interfaces principales
export * from './interfaces/template-engine.interface';

// Moteurs de rendu
export * from './engines/handlebars.engine';
export * from './engines/simple.engine';

// Loaders de templates
export * from './loaders/file-template.loader';
export * from './loaders/function-template.loader';

// Provider de base
export * from './providers/base-template.provider';

// Décorateurs
export * from './decorators/template-config.decorator';

// Module principal
export * from './notification-template.module';

// Types et utilitaires
export type { TemplateFunctionMap } from './loaders/function-template.loader';

// Pas de ré-exports pour éviter les références circulaires
// Les exports principaux sont déjà disponibles via les exports individuels ci-dessus