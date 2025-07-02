import { Injectable, Logger } from '@nestjs/common';
import { TemplateLoader, TemplateEngineConfig } from '../interfaces/template-engine.interface';
import { readFile, access, readdir } from 'fs/promises';
import { join, resolve } from 'path';

/**
 * Loader pour les templates stockés dans des fichiers
 */
@Injectable()
export class FileTemplateLoader implements TemplateLoader {
    private readonly logger = new Logger(FileTemplateLoader.name);
    private readonly templateCache = new Map<string, { content: string; mtime: number }>();
    private readonly templatesPath: string;
    private readonly templateExtension: string;
    private readonly enableCache: boolean;
    private readonly cacheTtl: number;

    constructor(private readonly config: TemplateEngineConfig) {
        this.templatesPath = resolve(config.templatesPath || './templates');
        this.templateExtension = config.templateExtension || this.getDefaultExtension();
        this.enableCache = config.enableCache !== false; // Cache activé par défaut
        this.cacheTtl = config.cacheTtl || 300000; // 5 minutes par défaut

        this.logger.log(`FileTemplateLoader initialized with path: ${this.templatesPath}`);
    }

    /**
     * Charge un template par son nom
     */
    async load(templateName: string): Promise<string> {
        const templatePath = this.getTemplatePath(templateName);

        try {
            // Vérifier le cache si activé
            if (this.enableCache) {
                const cached = await this.getCachedTemplate(templatePath, templateName);
                if (cached) {
                    this.logger.debug(`Template '${templateName}' loaded from cache`);
                    return cached;
                }
            }

            // Charger depuis le fichier
            const content = await readFile(templatePath, 'utf-8');

            // Mettre en cache si activé
            if (this.enableCache) {
                await this.setCachedTemplate(templatePath, templateName, content);
            }

            this.logger.debug(`Template '${templateName}' loaded from file: ${templatePath}`);
            return content;

        } catch (error) {
            this.logger.error(`Failed to load template '${templateName}' from ${templatePath}: ${error.message}`);
            throw new Error(`Template '${templateName}' not found or unreadable`);
        }
    }

    /**
     * Vérifie si un template existe
     */
    async exists(templateName: string): Promise<boolean> {
        const templatePath = this.getTemplatePath(templateName);

        console.log('templatePath',templatePath);

        try {
            await access(templatePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Liste tous les templates disponibles
     */
    async list(): Promise<string[]> {
        try {
            const files = await readdir(this.templatesPath);
            return files
                .filter(file => file.endsWith(this.templateExtension))
                .map(file => file.replace(this.templateExtension, ''));
        } catch (error) {
            this.logger.error(`Failed to list templates in ${this.templatesPath}: ${error.message}`);
            return [];
        }
    }

    /**
     * Vide le cache des templates
     */
    clearCache(): void {
        this.templateCache.clear();
        this.logger.log('Template cache cleared');
    }

    /**
     * Retourne les statistiques du cache
     */
    getCacheStats(): { size: number; templates: string[] } {
        return {
            size: this.templateCache.size,
            templates: Array.from(this.templateCache.keys())
        };
    }

    /**
     * Recharge un template spécifique (ignore le cache)
     */
    async reload(templateName: string): Promise<string> {
        const templatePath = this.getTemplatePath(templateName);

        try {
            const content = await readFile(templatePath, 'utf-8');

            // Mettre à jour le cache
            if (this.enableCache) {
                await this.setCachedTemplate(templatePath, templateName, content, true);
            }

            this.logger.debug(`Template '${templateName}' reloaded from file`);
            return content;

        } catch (error) {
            this.logger.error(`Failed to reload template '${templateName}': ${error.message}`);
            throw new Error(`Template '${templateName}' not found or unreadable`);
        }
    }

    /**
     * Construit le chemin complet vers un template
     */
    private getTemplatePath(templateName: string): string {
        // Si le nom contient déjà l'extension, l'utiliser tel quel
        if (templateName.includes('.')) {
            return join(this.templatesPath, templateName);
        }

        // Sinon, ajouter l'extension par défaut
        return join(this.templatesPath, `${templateName}${this.templateExtension}`);
    }

    /**
     * Récupère un template depuis le cache
     */
    private async getCachedTemplate(templatePath: string, templateName: string): Promise<string | null> {
        const cached = this.templateCache.get(templateName);

        if (!cached) {
            return null;
        }

        // Vérifier l'âge du cache
        const now = Date.now();
        if (now - cached.mtime > this.cacheTtl) {
            this.templateCache.delete(templateName);
            this.logger.debug(`Cache expired for template '${templateName}'`);
            return null;
        }

        // Vérifier si le fichier a été modifié
        try {
            const stats = await import('fs').then(fs => fs.promises.stat(templatePath));
            if (stats.mtime.getTime() > cached.mtime) {
                this.templateCache.delete(templateName);
                this.logger.debug(`Template '${templateName}' modified, cache invalidated`);
                return null;
            }
        } catch (error) {
            // Si on ne peut pas vérifier les stats, utiliser le cache quand même
            this.logger.warn(`Could not check file stats for '${templateName}': ${error.message}`);
        }

        return cached.content;
    }

    /**
     * Met un template en cache
     */
    private async setCachedTemplate(
        templatePath: string,
        templateName: string,
        content: string,
        force: boolean = false
    ): Promise<void> {
        try {
            let mtime = Date.now();

            if (!force) {
                // Utiliser la date de modification du fichier si disponible
                const stats = await import('fs').then(fs => fs.promises.stat(templatePath));
                mtime = stats.mtime.getTime();
            }

            this.templateCache.set(templateName, { content, mtime });
            this.logger.debug(`Template '${templateName}' cached`);

        } catch (error) {
            this.logger.warn(`Could not cache template '${templateName}': ${error.message}`);
            // Ne pas lever d'erreur, juste continuer sans cache
        }
    }

    /**
     * Retourne l'extension par défaut selon le moteur configuré
     */
    private getDefaultExtension(): string {
        switch (this.config.engine) {
            case 'handlebars':
                return '.hbs';
            case 'mustache':
                return '.mustache';
            case 'simple':
                return '.txt';
            default:
                return '.txt';
        }
    }

    /**
     * Valide le chemin des templates au démarrage
     */
    async validateTemplatesPath(): Promise<{ isValid: boolean; error?: string }> {
        try {
            await access(this.templatesPath);

            // Vérifier qu'on peut lire le dossier
            await readdir(this.templatesPath);

            return { isValid: true };
        } catch (error) {
            const errorMessage = `Templates path '${this.templatesPath}' is not accessible: ${error.message}`;
            this.logger.error(errorMessage);
            return { isValid: false, error: errorMessage };
        }
    }

    /**
     * Surveille les modifications de fichiers (optionnel)
     */
    async watchTemplates(callback: (templateName: string) => void): Promise<void> {
        try {
            const { watch } = await import('fs');

            watch(this.templatesPath, { recursive: true }, (eventType, filename) => {
                if (filename && filename.endsWith(this.templateExtension)) {
                    const templateName = filename.replace(this.templateExtension, '');

                    // Invalider le cache
                    if (this.templateCache.has(templateName)) {
                        this.templateCache.delete(templateName);
                        this.logger.debug(`Cache invalidated for modified template '${templateName}'`);
                    }

                    // Notifier le callback
                    callback(templateName);
                }
            });

            this.logger.log('Template file watching enabled');
        } catch (error) {
            this.logger.warn(`Could not setup template file watching: ${error.message}`);
        }
    }
}
