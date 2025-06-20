import { Controller, Get, Param, Query, NotFoundException, Patch, Body } from '@nestjs/common';
import { EventTypesService } from './event-types.service';
import { EventType } from '../entities/event-type.entity';

/**
 * Contrôleur pour la gestion des types d'événements
 * Lectures et modification du champ 'enabled' uniquement
 */
@Controller('event-types')
export class EventTypesController {
    constructor(private readonly eventTypesService: EventTypesService) {}

    /**
     * Récupère tous les types d'événements
     * @param enabled Filtrer par statut activé/désactivé
     * @param search Recherche par nom ou description
     */
    @Get()
    async findAll(
        @Query('enabled') enabled?: string,
        @Query('search') search?: string
    ): Promise<EventType[]> {
        const filters = {
            enabled: enabled !== undefined ? enabled === 'true' : undefined,
            search: search || undefined
        };

        return this.eventTypesService.findAll(filters);
    }

    /**
     * Récupère un type d'événement par son nom
     * @param name Nom de l'événement (unique)
     */
    @Get(':name')
    async findByName(@Param('name') name: string): Promise<EventType> {
        const eventType = await this.eventTypesService.findByName(name);
        
        if (!eventType) {
            throw new NotFoundException(`Type d'événement '${name}' non trouvé`);
        }

        return eventType;
    }

    /**
     * Récupère les statistiques des types d'événements
     */
    @Get('stats/summary')
    async getStats() {
        return this.eventTypesService.getStats();
    }

    /**
     * Récupère les types d'événements par canal
     * @param channel Canal de notification
     */
    @Get('channels/:channel')
    async findByChannel(@Param('channel') channel: string): Promise<EventType[]> {
        return this.eventTypesService.findByChannel(channel);
    }

    /**
     * Récupère les types d'événements par priorité
     * @param priority Priorité de l'événement
     */
    @Get('priority/:priority')
    async findByPriority(@Param('priority') priority: string): Promise<EventType[]> {
        return this.eventTypesService.findByPriority(priority);
    }

    /**
     * Met à jour uniquement le statut enabled d'un type d'événement
     * @param name Nom de l'événement
     * @param updateData Données à mettre à jour (seul 'enabled' est autorisé)
     */
    @Patch(':name')
    async updateEnabled(
        @Param('name') name: string,
        @Body() updateData: { enabled: boolean }
    ): Promise<EventType> {
        // Validation: seul le champ 'enabled' est autorisé
        const allowedFields = ['enabled'];
        const providedFields = Object.keys(updateData);
        const invalidFields = providedFields.filter(field => !allowedFields.includes(field));
        
        if (invalidFields.length > 0) {
            throw new NotFoundException(`Champs non autorisés: ${invalidFields.join(', ')}. Seul 'enabled' peut être modifié.`);
        }

        if (typeof updateData.enabled !== 'boolean') {
            throw new NotFoundException('Le champ enabled doit être un booléen');
        }

        return this.eventTypesService.updateEnabled(name, updateData.enabled);
    }
}