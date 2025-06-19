import { Injectable, SetMetadata, applyDecorators } from '@nestjs/common';
import { NotificationChannel } from '../types/interfaces';

/**
 * Métadonnées pour un provider de notification
 */
export interface NotifierMetadata {
    /** Canal de notification géré par ce provider */
    channel: NotificationChannel;

    /** Driver utilisé par ce provider */
    driver?: string;

    /** Description du provider */
    description?: string;

    /** Provider activé par défaut */
    enabled?: boolean;
}

/**
 * Clé pour stocker les métadonnées du notifier
 */
export const NOTIFIER_METADATA_KEY = 'injectable-notifier';

/**
 * Registry global des providers de notification découverts
 */
export class NotifierRegistry {
    private static providers = new Map<string, any>();
    private static metadata = new Map<string, NotifierMetadata>();

    /**
     * Enregistre un provider de notification
     */
    static register(target: any, metadata: NotifierMetadata): void {
        const name = target.name;

        // Vérification des doublons de canal
        const existingProvider = Array.from(this.metadata.entries())
            .find(([, meta]) => meta.channel === metadata.channel);

        if (existingProvider) {
            throw new Error(
                `Canal '${metadata.channel}' déjà utilisé par ${existingProvider[0]}. ` +
                `Impossible d'enregistrer ${name} avec le même canal.`
            );
        }

        this.providers.set(name, target);
        this.metadata.set(name, metadata);
    }

    /**
     * Récupère tous les providers enregistrés
     */
    static getProviders(): any[] {
        return Array.from(this.providers.values());
    }

    /**
     * Récupère les métadonnées d'un provider
     */
    static getMetadata(providerName: string): NotifierMetadata | undefined {
        return this.metadata.get(providerName);
    }

    /**
     * Récupère tous les canaux disponibles
     */
    static getChannels(): NotificationChannel[] {
        return Array.from(this.metadata.values()).map(meta => meta.channel);
    }

    /**
     * Trouve un provider par canal
     */
    static getProviderByChannel(channel: NotificationChannel): any | undefined {
        const entry = Array.from(this.metadata.entries())
            .find(([, meta]) => meta.channel === channel);

        return entry ? this.providers.get(entry[0]) : undefined;
    }

    /**
     * Vide le registry (utile pour les tests)
     */
    static clear(): void {
        this.providers.clear();
        this.metadata.clear();
    }
}

/**
 * Valide qu'une classe étend NotificationProviderBase
 */
function validateNotificationProvider(target: any): void {
    // Vérification que la classe a les méthodes requises (signature de NotificationProviderBase)
    const hasRequiredMethods = typeof target.prototype?.send === 'function' &&
                              typeof target.prototype?.validateConfig === 'function' &&
                              typeof target.prototype?.healthCheck === 'function';

    if (!hasRequiredMethods) {
        throw new Error(
            `La classe ${target.name} doit implémenter NotificationProvider avec ` +
            `les méthodes send(), validateConfig() et healthCheck().`
        );
    }

    // Vérification que la classe implémente l'interface NotificationProvider
    // On vérifie la présence des propriétés requises
    const hasRequiredProperties = target.prototype?.constructor?.name !== undefined;
}

/**
 * Décorateur pour marquer une classe comme provider de notification
 *
 * Ce décorateur:
 * - Applique @Injectable() pour l'injection de dépendances NestJS
 * - Valide que la classe implémente NotificationProvider
 * - Enregistre le provider dans un registry global pour auto-découverte
 * - Stocke les métadonnées du provider
 *
 * @param metadata Métadonnées du provider (canal, driver, description)
 *
 * @example
 * ```typescript
 * @InjectableNotifier({
 *     channel: 'email',
 *     driver: 'smtp',
 *     description: 'Provider pour notifications email'
 * })
 * export class EmailProvider extends NotificationProviderBase<SmtpDriver> {
 *     // ...
 * }
 * ```
 */
export function InjectableNotifier(metadata: NotifierMetadata) {
    return applyDecorators(
        // Application des décorateurs NestJS de base
        Injectable(),
        SetMetadata(NOTIFIER_METADATA_KEY, metadata),

        // Décorateur personnalisé pour validation et enregistrement
        function <T extends new (...args: any[]) => any>(target: T) {
            // 1. Validation que la classe étend NotificationProviderBase
            validateNotificationProvider(target);

            // 2. Enregistrement dans le registry global
            NotifierRegistry.register(target, metadata);

            // 3. Log pour debugging (en développement)
            if (process.env.NODE_ENV === 'development') {
                console.log(
                    `[InjectableNotifier] Provider '${target.name}' enregistré ` +
                    `pour le canal '${metadata.channel}' avec le driver '${metadata.driver || 'custom'}'`
                );
            }

            return target;
        }
    );
}

/**
 * Fonction utilitaire pour découvrir automatiquement tous les providers
 * de notification enregistrés
 *
 * @example
 * ```typescript
 * @Module({
 *     providers: [
 *         ...discoverNotificationProviders(),
 *         // Autres providers...
 *     ]
 * })
 * export class AppModule {}
 * ```
 */
export function discoverNotificationProviders(): any[] {
    return NotifierRegistry.getProviders();
}

/**
 * Fonction utilitaire pour obtenir les métadonnées d'un provider
 */
export function getNotifierMetadata(target: any): NotifierMetadata | undefined {
    return Reflect.getMetadata(NOTIFIER_METADATA_KEY, target);
}
