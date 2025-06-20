import { Command, CommandRunner } from 'nest-commander';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventType } from '../entities/event-type.entity';
import { eventTypesConfig } from '../config';

@Injectable()
@Command({
    name: 'sync-events',
    description: 'Synchronise les types d\'événements de la configuration vers la base de données',
})
export class SyncEventsCommand extends CommandRunner {
    private readonly logger = new Logger(SyncEventsCommand.name);

    constructor(
        @InjectRepository(EventType)
        private readonly eventTypeRepository: Repository<EventType>
    ) {
        super();
    }

    async run(): Promise<void> {
        this.logger.log('🔄 Début de la synchronisation des types d\'événements...');

        try {
            const configEvents = Object.entries(eventTypesConfig);
            let created = 0;
            let updated = 0;
            let skipped = 0;

            for (const [eventName, eventConfig] of configEvents) {
                try {
                    // Chercher si l'événement existe déjà (y compris les soft-deleted)
                    let existingEvent = await this.eventTypeRepository.findOne({
                        where: { name: eventName },
                        withDeleted: true
                    });

                    if (existingEvent) {
                        // Mettre à jour l'événement existant
                        const hasChanges = this.hasConfigChanges(existingEvent, eventConfig);

                        if (hasChanges || existingEvent.deletedAt) {
                            // Restaurer l'événement s'il était soft-deleted
                            if (existingEvent.deletedAt) {
                                await this.eventTypeRepository.restore(existingEvent.id);
                            }

                            await this.eventTypeRepository.update(existingEvent.id, {
                                description: eventConfig.description,
                                subject: (eventConfig as any).subject,
                                channels: [...eventConfig.channels],
                                defaultProcessing: eventConfig.defaultProcessing,
                                waitForResult: eventConfig.waitForResult,
                                retryAttempts: eventConfig.retryAttempts,
                                priority: eventConfig.priority,
                                timeout: eventConfig.timeout || null
                            });
                            updated++;
                            this.logger.log(`✅ Mis à jour: ${eventName}`);
                        } else {
                            skipped++;
                            this.logger.debug(`⏭️  Ignoré (pas de changement): ${eventName}`);
                        }
                    } else {
                        // Créer un nouvel événement
                        const newEvent = this.eventTypeRepository.create({
                            name: eventName,
                            description: eventConfig.description,
                            subject: (eventConfig as any).subject,
                            channels: [...eventConfig.channels],
                            defaultProcessing: eventConfig.defaultProcessing,
                            waitForResult: eventConfig.waitForResult,
                            retryAttempts: eventConfig.retryAttempts,
                            priority: eventConfig.priority,
                            timeout: eventConfig.timeout || null,
                            enabled: true,
                        });

                        await this.eventTypeRepository.save(newEvent);
                        created++;
                        this.logger.log(`🆕 Créé: ${eventName}`);
                    }
                } catch (error) {
                    this.logger.error(`❌ Erreur lors du traitement de ${eventName}: ${error.message}`);
                }
            }

            // Note: Les événements qui ne sont plus dans la configuration ne sont pas modifiés
            // Le statut 'enabled' doit être géré manuellement via l'API

            this.logger.log('✅ Synchronisation terminée avec succès !');
            this.logger.log(`📊 Résumé: ${created} créés, ${updated} mis à jour, ${skipped} ignorés`);

        } catch (error) {
            this.logger.error('❌ Erreur lors de la synchronisation:', error.message);
            throw error;
        }
    }

    /**
     * Vérifie si l'événement en base a des différences avec la configuration
     */
    private hasConfigChanges(dbEvent: EventType, config: any): boolean {
        return (
            dbEvent.description !== config.description ||
            dbEvent.subject !== config.subject ||
            JSON.stringify(dbEvent.channels) !== JSON.stringify(config.channels) ||
            dbEvent.defaultProcessing !== config.defaultProcessing ||
            dbEvent.waitForResult !== config.waitForResult ||
            dbEvent.retryAttempts !== config.retryAttempts ||
            dbEvent.priority !== config.priority ||
            dbEvent.timeout !== config.timeout
        );
    }
}
