import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { EventType } from '../entities/event-type.entity';

export interface EventTypeFilters {
    enabled?: boolean;
    search?: string;
}

export interface EventTypeStats {
    total: number;
    enabled: number;
    disabled: number;
    byPriority: Record<string, number>;
    byChannel: Record<string, number>;
    byProcessing: Record<string, number>;
}

@Injectable()
export class EventTypesService {
    constructor(
        @InjectRepository(EventType)
        private readonly eventTypeRepository: Repository<EventType>
    ) {}

    /**
     * Récupère tous les types d'événements avec filtres optionnels
     */
    async findAll(filters: EventTypeFilters = {}): Promise<EventType[]> {
        const query = this.eventTypeRepository.createQueryBuilder('eventType');

        // Filtre par statut activé/désactivé
        if (filters.enabled !== undefined) {
            query.andWhere('eventType.enabled = :enabled', { enabled: filters.enabled });
        }

        // Recherche textuelle dans le nom ou la description
        if (filters.search) {
            query.andWhere(
                '(eventType.name LIKE :search OR eventType.description LIKE :search)',
                { search: `%${filters.search}%` }
            );
        }

        return query
            .orderBy('eventType.name', 'ASC')
            .getMany();
    }

    /**
     * Trouve un type d'événement par son nom (unique)
     */
    async findByName(name: string): Promise<EventType | null> {
        return this.eventTypeRepository.findOne({
            where: { name }
        });
    }

    /**
     * Trouve les types d'événements qui utilisent un canal spécifique
     */
    async findByChannel(channel: string): Promise<EventType[]> {
        return this.eventTypeRepository
            .createQueryBuilder('eventType')
            .where('JSON_CONTAINS(eventType.channels, JSON_QUOTE(:channel))', { channel })
            .andWhere('eventType.enabled = true')
            .orderBy('eventType.name', 'ASC')
            .getMany();
    }

    /**
     * Trouve les types d'événements par priorité
     */
    async findByPriority(priority: string): Promise<EventType[]> {
        return this.eventTypeRepository.find({
            where: { 
                priority,
                enabled: true 
            },
            order: { name: 'ASC' }
        });
    }

    /**
     * Récupère les statistiques des types d'événements
     */
    async getStats(): Promise<EventTypeStats> {
        const allEvents = await this.eventTypeRepository.find();

        const stats: EventTypeStats = {
            total: allEvents.length,
            enabled: allEvents.filter(e => e.enabled).length,
            disabled: allEvents.filter(e => !e.enabled).length,
            byPriority: {},
            byChannel: {},
            byProcessing: {}
        };

        // Statistiques par priorité
        for (const event of allEvents) {
            if (event.enabled) {
                stats.byPriority[event.priority] = (stats.byPriority[event.priority] || 0) + 1;
                stats.byProcessing[event.defaultProcessing] = (stats.byProcessing[event.defaultProcessing] || 0) + 1;

                // Statistiques par canal
                if (event.channels) {
                    for (const channel of event.channels) {
                        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
                    }
                }
            }
        }

        return stats;
    }

    /**
     * Compte le nombre d'événements actifs
     */
    async countEnabled(): Promise<number> {
        return this.eventTypeRepository.count({
            where: { enabled: true }
        });
    }

    /**
     * Récupère les événements récemment mis à jour
     */
    async getRecentlyUpdated(limit: number = 10): Promise<EventType[]> {
        return this.eventTypeRepository.find({
            order: { updatedAt: 'DESC' },
            take: limit
        });
    }

    /**
     * Met à jour uniquement le statut enabled d'un événement
     */
    async updateEnabled(name: string, enabled: boolean): Promise<EventType> {
        const eventType = await this.findByName(name);
        
        if (!eventType) {
            throw new NotFoundException(`Type d'événement '${name}' non trouvé`);
        }

        eventType.enabled = enabled;
        return this.eventTypeRepository.save(eventType);
    }
}