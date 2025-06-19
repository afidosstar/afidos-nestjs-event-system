import { Module, DynamicModule, Provider } from '@nestjs/common';
import { HttpDriver, HttpDriverConfig } from '../drivers/http.driver';
import { SmtpDriver, SmtpDriverConfig as SmtpDriverConfigInternal } from '../drivers/smtp.driver';
import { PackageConfig, EventPayloads } from '../types/interfaces';
import { SmtpDriverConfig } from '../types/driver.types';
import { NotifierRegistry } from '../decorators/injectable-notifier.decorator';

/**
 * Module pour la gestion dynamique des drivers basée sur la configuration
 * 
 * Ce module:
 * - Analyse la configuration PackageConfig.drivers
 * - Enregistre uniquement les drivers configurés
 * - Crée les providers avec les bonnes configurations
 * - Évite l'injection de drivers non nécessaires
 */
@Module({})
export class DriversModule {
    /**
     * Configure le module avec les drivers basés sur PackageConfig
     */
    static forRoot<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        const driverProviders: Provider[] = [];
        const exports: any[] = [];

        // Configurer les drivers disponibles dans le registry
        const configuredDrivers = this.getConfiguredDrivers(config);
        NotifierRegistry.setConfiguredDrivers(configuredDrivers);

        // HttpDriver si configuré
        if (config.drivers?.http) {
            const httpDriverProvider: Provider = {
                provide: HttpDriver,
                useFactory: () => new HttpDriver(config.drivers!.http!),
            };
            driverProviders.push(httpDriverProvider);
            exports.push(HttpDriver);
        }

        // SmtpDriver si configuré
        if (config.drivers?.smtp) {
            const smtpDriverProvider: Provider = {
                provide: SmtpDriver,
                useFactory: () => {
                    const smtpConfig = config.drivers!.smtp!;
                    // Conversion du type externe vers le type interne
                    const internalConfig: SmtpDriverConfigInternal = {
                        host: smtpConfig.host,
                        port: smtpConfig.port,
                        secure: smtpConfig.secure,
                        auth: smtpConfig.auth || { user: '', pass: '' }, // Valeur par défaut si non fourni
                        timeout: smtpConfig.timeout,
                        pool: smtpConfig.pool,
                        maxConnections: smtpConfig.maxConnections,
                        maxMessages: smtpConfig.maxMessages
                    };
                    return new SmtpDriver(internalConfig);
                },
            };
            driverProviders.push(smtpDriverProvider);
            exports.push(SmtpDriver);
        }

        return {
            module: DriversModule,
            providers: driverProviders,
            exports: exports,
            global: true, // Rend les drivers disponibles globalement
        };
    }

    /**
     * Configuration asynchrone des drivers
     */
    static forRootAsync<T extends EventPayloads = EventPayloads>(options: {
        useFactory: (...args: any[]) => Promise<PackageConfig<T>> | PackageConfig<T>;
        inject?: any[];
    }): DynamicModule {
        return {
            module: DriversModule,
            providers: [
                {
                    provide: 'DRIVERS_CONFIG_ASYNC',
                    useFactory: async (...args: any[]) => {
                        const config = await options.useFactory(...args);
                        // Configurer les drivers disponibles dans le registry
                        const configuredDrivers = this.getConfiguredDrivers(config);
                        NotifierRegistry.setConfiguredDrivers(configuredDrivers);
                        return config;
                    },
                    inject: options.inject || [],
                },
                {
                    provide: HttpDriver,
                    useFactory: async (config: PackageConfig<T>) => {
                        if (config.drivers?.http) {
                            return new HttpDriver(config.drivers.http);
                        }
                        return null;
                    },
                    inject: ['DRIVERS_CONFIG_ASYNC'],
                },
                {
                    provide: SmtpDriver,
                    useFactory: async (config: PackageConfig<T>) => {
                        if (config.drivers?.smtp) {
                            const smtpConfig = config.drivers.smtp;
                            // Conversion du type externe vers le type interne
                            const internalConfig: SmtpDriverConfigInternal = {
                                host: smtpConfig.host,
                                port: smtpConfig.port,
                                secure: smtpConfig.secure,
                                auth: smtpConfig.auth || { user: '', pass: '' },
                                timeout: smtpConfig.timeout,
                                pool: smtpConfig.pool,
                                maxConnections: smtpConfig.maxConnections,
                                maxMessages: smtpConfig.maxMessages
                            };
                            return new SmtpDriver(internalConfig);
                        }
                        return null;
                    },
                    inject: ['DRIVERS_CONFIG_ASYNC'],
                },
            ],
            exports: [HttpDriver, SmtpDriver],
            global: true,
        };
    }

    /**
     * Version pour mode API uniquement
     */
    static forApi<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        return this.forRoot(config);
    }

    /**
     * Version pour mode Worker uniquement
     */
    static forWorker<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): DynamicModule {
        return this.forRoot(config);
    }

    /**
     * Version asynchrone pour mode Worker uniquement
     */
    static forWorkerAsync<T extends EventPayloads = EventPayloads>(options: {
        useFactory: (...args: any[]) => Promise<PackageConfig<T>> | PackageConfig<T>;
        inject?: any[];
    }): DynamicModule {
        return this.forRootAsync(options);
    }

    /**
     * Version asynchrone pour mode API uniquement
     */
    static forApiAsync<T extends EventPayloads = EventPayloads>(options: {
        useFactory: (...args: any[]) => Promise<PackageConfig<T>> | PackageConfig<T>;
        inject?: any[];
    }): DynamicModule {
        return this.forRootAsync(options);
    }

    /**
     * Méthode utilitaire pour vérifier quels drivers sont configurés
     */
    static getConfiguredDrivers<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): string[] {
        const drivers: string[] = [];
        
        if (config.drivers?.http) {
            drivers.push('http');
        }
        
        if (config.drivers?.smtp) {
            drivers.push('smtp');
        }
        
        return drivers;
    }

    /**
     * Méthode utilitaire pour filtrer les providers selon les drivers disponibles
     */
    static filterProvidersByAvailableDrivers<T extends EventPayloads = EventPayloads>(
        providers: any[],
        config: PackageConfig<T>
    ): any[] {
        const configuredDrivers = this.getConfiguredDrivers(config);
        const filteredProviders: any[] = [];

        for (const provider of providers) {
            // Récupérer les métadonnées du provider
            const metadata = Reflect.getMetadata('injectable-notifier', provider);
            
            if (metadata && metadata.driver) {
                // Vérifier si le driver requis est configuré
                if (configuredDrivers.includes(metadata.driver)) {
                    filteredProviders.push(provider);
                } else {
                    console.warn(
                        `[DriversModule] Provider '${provider.name}' ignoré car le driver '${metadata.driver}' n'est pas configuré. ` +
                        `Drivers disponibles: [${configuredDrivers.join(', ')}]`
                    );
                }
            } else {
                // Provider sans driver spécifique, on l'inclut
                filteredProviders.push(provider);
            }
        }

        return filteredProviders;
    }

    /**
     * Méthode utilitaire pour valider la configuration des drivers
     */
    static validateDriversConfig<T extends EventPayloads = EventPayloads>(
        config: PackageConfig<T>
    ): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validation HttpDriver
        if (config.drivers?.http) {
            const httpConfig = config.drivers.http;
            if (httpConfig.timeout && (httpConfig.timeout < 1000 || httpConfig.timeout > 300000)) {
                errors.push('HTTP driver timeout must be between 1000 and 300000 milliseconds');
            }
            if (httpConfig.retries && (httpConfig.retries < 0 || httpConfig.retries > 10)) {
                errors.push('HTTP driver retries must be between 0 and 10');
            }
        }

        // Validation SmtpDriver
        if (config.drivers?.smtp) {
            const smtpConfig = config.drivers.smtp;
            if (!smtpConfig.host) {
                errors.push('SMTP driver host is required');
            }
            if (smtpConfig.port && (smtpConfig.port < 1 || smtpConfig.port > 65535)) {
                errors.push('SMTP driver port must be between 1 and 65535');
            }
            if (smtpConfig.secure !== undefined && typeof smtpConfig.secure !== 'boolean') {
                errors.push('SMTP driver secure must be a boolean');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}