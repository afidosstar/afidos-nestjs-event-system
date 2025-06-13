import { Command, CommandRunner, Option } from 'nest-commander';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { EventTypeEntity } from '../entities';
import { EventTypesConfig, EventPayloads } from '../types/interfaces';
import * as path from 'path';
import * as fs from 'fs';

interface SyncCommandOptions {
    config?: string;
    dryRun?: boolean;
    force?: boolean;
    backup?: boolean;
    verbose?: boolean;
}


/**
 * Commande CLI pour synchroniser la configuration des événements avec la base de données
 */
@Command({
    name: 'sync-event-types',
    description: 'Synchronize event types configuration to database',
    // @ts-ignore
    examples: [
        'sync-event-types',
        'sync-event-types --config ./config/events.config.ts',
        'sync-event-types --dry-run',
        'sync-event-types --force --backup'
    ]
})
@Injectable()
export class SyncEventTypesCommand extends CommandRunner {
    private readonly logger = new Logger(SyncEventTypesCommand.name);

    constructor(private dataSource: DataSource) {
        super();
    }

    async run(passedParam: string[], options?: SyncCommandOptions): Promise<void> {
        try {
            this.logger.log('🚀 Starting event types synchronization...');

            // Charger la configuration
            const config = await this.loadConfiguration(options?.config);
            if (!config) {
                this.logger.error('❌ No configuration found');
                process.exit(1);
            }

            // Backup si demandé
            if (options?.backup) {
                await this.createBackup();
            }

            // Dry run ou synchronisation réelle
            if (options?.dryRun) {
                await this.performDryRun(config, options);
            } else {
                await this.performSync(config, options);
            }

            this.logger.log('✅ Event types synchronization completed successfully');

        } catch (error) {
            this.logger.error('❌ Synchronization failed:', error.message);
            if (options?.verbose) {
                this.logger.error(error.stack);
            }
            process.exit(1);
        }
    }

    /**
     * Charger la configuration depuis un fichier
     */
    private async loadConfiguration(configPath?: string): Promise<EventTypesConfig<EventPayloads> | null> {
        const possiblePaths = [
            configPath,
            './src/config/events.config.ts',
            './src/config/events.config.js',
            './config/events.config.ts',
            './config/events.config.js',
            './events.config.ts',
            './events.config.js'
        ].filter(Boolean);

        for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
                this.logger.debug(`📂 Loading configuration from: ${filePath}`);

                try {
                    // Require dynamique pour supporter TypeScript et JavaScript
                    const configModule = require(path.resolve(filePath));
                    const config = configModule.default || configModule.eventTypesConfig || configModule;

                    if (this.isValidEventTypesConfig(config)) {
                        this.logger.log(`✅ Configuration loaded from: ${filePath}`);
                        return config;
                    } else {
                        this.logger.warn(`⚠️  Invalid configuration format in: ${filePath}`);
                    }
                } catch (error) {
                    this.logger.warn(`⚠️  Failed to load configuration from ${filePath}: ${error.message}`);
                }
            }
        }

        this.logger.error('❌ No valid configuration file found');
        this.logger.log('📖 Expected locations:');
        possiblePaths.forEach(p => p && this.logger.log(`   - ${p}`));

        return null;
    }

    /**
     * Valider le format de la configuration
     */
    private isValidEventTypesConfig(config: any): config is EventTypesConfig<EventPayloads> {
        if (!config || typeof config !== 'object') {
            return false;
        }

        // Vérifier que chaque clé a une configuration valide
        for (const [eventType, eventConfig] of Object.entries(config)) {
            if (!eventConfig || typeof eventConfig !== 'object') {
                this.logger.warn(`Invalid config for event type: ${eventType}`);
                return false;
            }

            const { description, channels } = eventConfig as any;
            if (!description || !Array.isArray(channels) || channels.length === 0) {
                this.logger.warn(`Missing description or channels for event type: ${eventType}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Créer une sauvegarde de la configuration actuelle
     */
    private async createBackup(): Promise<void> {
        this.logger.log('💾 Creating backup of current event types...');

        const repository = this.dataSource.getRepository(EventTypeEntity);
        const existingEventTypes = await repository.find();

        const backupData = {
            timestamp: new Date().toISOString(),
            eventTypes: existingEventTypes
        };

        const backupFileName = `event-types-backup-${Date.now()}.json`;
        const backupPath = path.resolve(backupFileName);

        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        this.logger.log(`✅ Backup created: ${backupPath}`);
    }

    /**
     * Effectuer un dry run pour voir les changements sans les appliquer
     */
    private async performDryRun(
        config: EventTypesConfig<EventPayloads>,
        options?: SyncCommandOptions
    ): Promise<void> {
        this.logger.log('🔍 Performing dry run (no changes will be made)...');

        const repository = this.dataSource.getRepository(EventTypeEntity);
        const existingEventTypes = await repository.find();
        const existingEventTypesMap = new Map(existingEventTypes.map(et => [et.name, et]));

        const changes:Record<string, any[]> = {
            toCreate: [],
            toUpdate: [],
            toDelete: []
        };

        // Identifier les changements
        for (const [eventTypeName, eventConfig] of Object.entries(config)) {
            const existing = existingEventTypesMap.get(eventTypeName);

            if (!existing) {
                changes.toCreate.push(eventTypeName);
            } else {
                const hasChanges = this.hasConfigurationChanges(existing, eventConfig);
                if (hasChanges) {
                    changes.toUpdate.push(eventTypeName);
                }
            }
        }

        // Types à supprimer (présents en DB mais pas dans la config)
        for (const existing of existingEventTypes) {
            if (!config[existing.name as keyof EventPayloads]) {
                changes.toDelete.push(existing.name);
            }
        }

        // Afficher le résumé
        this.logger.log('\n📊 Summary of changes:');
        this.logger.log(`   ➕ To create: ${changes.toCreate.length}`);
        this.logger.log(`   🔄 To update: ${changes.toUpdate.length}`);
        this.logger.log(`   ❌ To delete: ${changes.toDelete.length}`);

        if (options?.verbose) {
            if (changes.toCreate.length > 0) {
                this.logger.log('\n➕ Event types to create:');
                changes.toCreate.forEach(name => this.logger.log(`   - ${name}`));
            }

            if (changes.toUpdate.length > 0) {
                this.logger.log('\n🔄 Event types to update:');
                changes.toUpdate.forEach(name => this.logger.log(`   - ${name}`));
            }

            if (changes.toDelete.length > 0) {
                this.logger.log('\n❌ Event types to delete:');
                changes.toDelete.forEach(name => this.logger.log(`   - ${name}`));
            }
        }

        if (changes.toCreate.length === 0 && changes.toUpdate.length === 0 && changes.toDelete.length === 0) {
            this.logger.log('✅ No changes detected - database is up to date');
        }
    }

    /**
     * Effectuer la synchronisation réelle
     */
    private async performSync(
        config: EventTypesConfig<EventPayloads>,
        options?: SyncCommandOptions
    ): Promise<void> {
        this.logger.log('🔄 Synchronizing event types to database...');

        const repository = this.dataSource.getRepository(EventTypeEntity);

        // Utiliser une transaction pour assurer la cohérence
        await this.dataSource.transaction(async (transactionalEntityManager) => {
            const transactionalRepository = transactionalEntityManager.getRepository(EventTypeEntity);

            const existingEventTypes = await transactionalRepository.find();
            const existingEventTypesMap = new Map(existingEventTypes.map(et => [et.name, et]));

            let created = 0;
            let updated = 0;
            let deleted = 0;

            // Créer ou mettre à jour les types d'événements
            for (const [eventTypeName, eventConfig] of Object.entries(config)) {
                const existing = existingEventTypesMap.get(eventTypeName);

                if (!existing) {
                    // Créer nouveau type d'événement
                    const newEventType = this.createEventTypeEntity(eventTypeName, eventConfig);
                    await transactionalRepository.save(newEventType);
                    created++;

                    if (options?.verbose) {
                        this.logger.log(`➕ Created: ${eventTypeName}`);
                    }
                } else {
                    // Mettre à jour si nécessaire
                    const hasChanges = this.hasConfigurationChanges(existing, eventConfig);
                    if (hasChanges || options?.force) {
                        this.updateEventTypeEntity(existing, eventConfig);
                        await transactionalRepository.save(existing);
                        updated++;

                        if (options?.verbose) {
                            this.logger.log(`🔄 Updated: ${eventTypeName}`);
                        }
                    }
                }
            }

            // Supprimer les types d'événements qui ne sont plus dans la config
            if (options?.force) {
                for (const existing of existingEventTypes) {
                    if (!config[existing.name as keyof EventPayloads]) {
                        await transactionalRepository.remove(existing);
                        deleted++;

                        if (options?.verbose) {
                            this.logger.log(`❌ Deleted: ${existing.name}`);
                        }
                    }
                }
            }

            this.logger.log('\n📊 Synchronization summary:');
            this.logger.log(`   ➕ Created: ${created}`);
            this.logger.log(`   🔄 Updated: ${updated}`);
            this.logger.log(`   ❌ Deleted: ${deleted}`);
        });
    }

    /**
     * Créer une nouvelle entité EventType
     */
    private createEventTypeEntity(name: string, config: any): EventTypeEntity {
        const entity = new EventTypeEntity();
        entity.name = name;
        entity.description = config.description;
        entity.channels = config.channels;
        entity.defaultProcessing = config.defaultProcessing || 'async';
        entity.waitForResult = config.waitForResult || false;
        entity.retryAttempts = config.retryAttempts || 3;
        entity.priority = config.priority || 'normal';
        entity.delay = config.delay || null;
        entity.timeout = config.timeout || 30000;
        entity.schema = config.schema || null;
        entity.templates = config.templates || null;
        entity.isActive = true;
        entity.createdBy = 'cli-sync';
        entity.updatedBy = 'cli-sync';

        return entity;
    }

    /**
     * Mettre à jour une entité EventType existante
     */
    private updateEventTypeEntity(entity: EventTypeEntity, config: any): void {
        entity.description = config.description;
        entity.channels = config.channels;
        entity.defaultProcessing = config.defaultProcessing || 'async';
        entity.waitForResult = config.waitForResult || false;
        entity.retryAttempts = config.retryAttempts || 3;
        entity.priority = config.priority || 'normal';
        entity.delay = config.delay || null;
        entity.timeout = config.timeout || 30000;
        entity.schema = config.schema || null;
        entity.templates = config.templates || null;
        entity.updatedBy = 'cli-sync';
    }

    /**
     * Vérifier si la configuration a changé
     */
    private hasConfigurationChanges(entity: EventTypeEntity, config: any): boolean {
        return (
            entity.description !== config.description ||
            JSON.stringify(entity.channels) !== JSON.stringify(config.channels) ||
            entity.defaultProcessing !== (config.defaultProcessing || 'async') ||
            entity.waitForResult !== (config.waitForResult || false) ||
            entity.retryAttempts !== (config.retryAttempts || 3) ||
            entity.priority !== (config.priority || 'normal') ||
            entity.delay !== (config.delay || null) ||
            entity.timeout !== (config.timeout || 30000) ||
            JSON.stringify(entity.schema) !== JSON.stringify(config.schema || null) ||
            JSON.stringify(entity.templates) !== JSON.stringify(config.templates || null)
        );
    }

    @Option({
        flags: '-c, --config <path>',
        description: 'Path to the configuration file',
    })
    parseConfig(val: string): string {
        return val;
    }

    @Option({
        flags: '-d, --dry-run',
        description: 'Show what would be changed without making changes',
    })
    parseDryRun(): boolean {
        return true;
    }

    @Option({
        flags: '-f, --force',
        description: 'Force update even if no changes detected and delete removed event types',
    })
    parseForce(): boolean {
        return true;
    }

    @Option({
        flags: '-b, --backup',
        description: 'Create a backup before synchronization',
    })
    parseBackup(): boolean {
        return true;
    }

    @Option({
        flags: '-v, --verbose',
        description: 'Enable verbose output',
    })
    parseVerbose(): boolean {
        return true;
    }
}
