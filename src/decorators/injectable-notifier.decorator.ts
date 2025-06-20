import { Injectable, SetMetadata, applyDecorators } from '@nestjs/common';
import { NotificationChannel } from '../types/interfaces';

/**
 * Métadonnées pour un provider de notification
 */
export interface NotifierMetadata {
    /** Canal de notification géré par ce provider */
    channel: NotificationChannel;

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
 * Valide qu'une classe implémente NotificationProvider ou hérite de BaseNotificationProvider
 */
function validateNotificationProvider(target: any): void {
    const className = target.name;

    // 1. Vérifier que la classe a les méthodes requises de l'interface NotificationProvider
    const hasRequiredMethods = typeof target.prototype?.send === 'function' &&
                              typeof target.prototype?.validateConfig === 'function' &&
                              typeof target.prototype?.healthCheck === 'function';

    if (!hasRequiredMethods) {
        throw new Error(
            `@InjectableNotifier ne peut être appliqué qu'à des classes qui implémentent NotificationProvider ou héritent de BaseNotificationProvider.\n` +
            `La classe ${className} doit avoir les méthodes: send(), validateConfig(), healthCheck().\n` +
            `Vérifiez que votre classe implémente NotificationProvider ou hérite de BaseNotificationProvider.`
        );
    }

    // 2. Vérifier que la classe hérite de BaseNotificationProvider OU implémente directement NotificationProvider
    const extendsBaseNotificationProvider = checkIfExtendsBaseNotificationProvider(target);
    const implementsNotificationProviderDirectly = checkIfImplementsNotificationProviderDirectly(target);

    if (!extendsBaseNotificationProvider && !implementsNotificationProviderDirectly) {
        throw new Error(
            `@InjectableNotifier ne peut être appliqué qu'à des classes qui implémentent NotificationProvider ou héritent de BaseNotificationProvider.\n` +
            `La classe ${className} ne semble ni hériter de BaseNotificationProvider ni implémenter correctement NotificationProvider.\n` +
            `Solutions:\n` +
            `1. Faites hériter votre classe de BaseNotificationProvider: "class ${className} extends BaseNotificationProvider"\n` +
            `2. Ou implémentez directement NotificationProvider: "class ${className} implements NotificationProvider"`
        );
    }
}

/**
 * Vérifie si une classe hérite de BaseNotificationProvider
 */
function checkIfExtendsBaseNotificationProvider(target: any): boolean {
    let currentClass = target;

    // Parcourir la chaîne de prototypes pour chercher BaseNotificationProvider
    while (currentClass && currentClass.prototype) {
        // Vérifier le nom de la classe parent
        const parentClass = Object.getPrototypeOf(currentClass);
        if (parentClass && parentClass.name === 'BaseNotificationProvider') {
            return true;
        }

        // Vérifier si la classe a des méthodes caractéristiques de BaseNotificationProvider
        const hasBaseProviderMethods = typeof currentClass.prototype?.filterRecipientsByProperty === 'function' &&
                                     typeof currentClass.prototype?.createSkippedResult === 'function' &&
                                     typeof currentClass.prototype?.getChannelName === 'function';

        if (hasBaseProviderMethods) {
            return true;
        }

        currentClass = parentClass;

        // Éviter une boucle infinie
        if (currentClass === Object || currentClass === Function) {
            break;
        }
    }

    return false;
}

/**
 * Vérifie si une classe implémente directement NotificationProvider (sans hériter de BaseNotificationProvider)
 */
function checkIfImplementsNotificationProviderDirectly(target: any): boolean {
    // Si la classe hérite de BaseNotificationProvider, ce n'est pas une implémentation directe
    if (checkIfExtendsBaseNotificationProvider(target)) {
        return false;
    }

    // Vérifier que la classe a toutes les méthodes requises ET ne hérite pas de BaseNotificationProvider
    const hasAllMethods = typeof target.prototype?.send === 'function' &&
                         typeof target.prototype?.validateConfig === 'function' &&
                         typeof target.prototype?.healthCheck === 'function';

    // Vérifier que ce n'est pas juste une classe avec des méthodes au hasard
    // Une vraie implémentation devrait avoir une structure cohérente
    const hasReasonableStructure = target.prototype?.constructor === target;

    return hasAllMethods && hasReasonableStructure;
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
                    `pour le canal '${metadata.channel}'`
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
 * Fonction utilitaire pour découvrir tous les providers sans filtrage
 * (utilisée pour les cas où on veut tous les providers même sans drivers)
 */
export function discoverAllNotificationProviders(): any[] {
    return NotifierRegistry.getProviders();
}

/**
 * Fonction utilitaire pour obtenir les métadonnées d'un provider
 */
export function getNotifierMetadata(target: any): NotifierMetadata | undefined {
    return Reflect.getMetadata(NOTIFIER_METADATA_KEY, target);
}
