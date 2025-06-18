import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventHandler } from '../interfaces/event-handler.interface';

/**
 * Registry pour gérer les handlers d'événements
 * Découvre automatiquement les handlers et les enregistre
 */
@Injectable()
export class EventHandlerRegistryService implements OnModuleInit {
    private readonly logger = new Logger(EventHandlerRegistryService.name);
    private readonly handlers = new Map<string, EventHandler[]>();

    constructor(private readonly moduleRef: ModuleRef) {}

    async onModuleInit() {
        // Auto-découverte des handlers sera implémentée ici
        this.logger.log('EventHandlerRegistry initialisé');
    }

    /**
     * Enregistre un handler pour des types d'événements
     */
    registerHandler(handler: EventHandler): void {
        const eventTypes = handler.getEventTypes();
        
        for (const eventType of eventTypes) {
            if (!this.handlers.has(eventType)) {
                this.handlers.set(eventType, []);
            }
            
            this.handlers.get(eventType)!.push(handler);
        }

        this.logger.debug(`Handler '${handler.getName()}' enregistré pour: ${eventTypes.join(', ')}`);
    }

    /**
     * Récupère tous les handlers pour un type d'événement
     */
    getHandlers(eventType: string): EventHandler[] {
        // Récupère les handlers spécifiques pour ce type d'événement
        const specificHandlers = this.handlers.get(eventType) || [];
        
        // Récupère les handlers génériques (wildcard)
        const wildcardHandlers = this.handlers.get('*') || [];
        
        // Combine les deux listes
        const allHandlers = [...specificHandlers, ...wildcardHandlers];
        
        // Trie par priorité (plus haute en premier)
        return allHandlers.sort((a, b) => {
            const priorityA = a.getPriority?.() || 0;
            const priorityB = b.getPriority?.() || 0;
            return priorityB - priorityA;
        });
    }

    /**
     * Vérifie si un type d'événement a des handlers
     */
    hasHandlers(eventType: string): boolean {
        return this.handlers.has(eventType) && this.handlers.get(eventType)!.length > 0;
    }

    /**
     * Retourne les statistiques du registry
     */
    getStats(): { 
        totalHandlers: number; 
        eventTypes: string[]; 
        handlersByEvent: Record<string, string[]> 
    } {
        const handlersByEvent: Record<string, string[]> = {};
        
        for (const [eventType, handlers] of this.handlers.entries()) {
            handlersByEvent[eventType] = handlers.map(h => h.getName());
        }

        return {
            totalHandlers: Array.from(this.handlers.values()).reduce((acc, handlers) => acc + handlers.length, 0),
            eventTypes: Array.from(this.handlers.keys()),
            handlersByEvent
        };
    }

    /**
     * Nettoie tous les handlers (pour les tests)
     */
    clear(): void {
        this.handlers.clear();
    }
}