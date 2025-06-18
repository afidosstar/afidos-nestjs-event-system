import { Injectable, SetMetadata } from '@nestjs/common';
import { HandlerQueueConfig } from '../types/handler-queue.types';

export interface HandlerMetadata {
    name: string;
    eventTypes: string[];
    priority?: number;
    description?: string;
    queue?: HandlerQueueConfig;
}

export const HANDLER_METADATA_KEY = 'handler:metadata';

/**
 * Décorateur pour marquer une classe comme handler d'événements avec support des queues
 */
export function InjectableHandler(metadata: HandlerMetadata) {
    return function <T extends new(...args: any[]) => any>(constructor: T) {
        // Applique @Injectable() automatiquement
        Injectable()(constructor);
        
        // Valide la configuration de queue
        if (metadata.queue) {
            validateQueueConfig(metadata.queue);
        }
        
        // Stocke les métadonnées du handler
        SetMetadata(HANDLER_METADATA_KEY, metadata)(constructor);
        
        // Enregistre le handler dans le registry global
        HandlerRegistry.register(constructor, metadata);
        
        return constructor;
    };
}

/**
 * Valide la configuration de queue
 */
function validateQueueConfig(config: HandlerQueueConfig) {
    if (config.processing === 'delayed' && !config.delay) {
        throw new Error('Delay configuration is required for delayed processing');
    }
    
    if (config.priority && (config.priority < 1 || config.priority > 10)) {
        throw new Error('Queue priority must be between 1 and 10');
    }
    
    if (config.concurrency && config.concurrency < 1) {
        throw new Error('Concurrency must be greater than 0');
    }
}

/**
 * Registry global pour la découverte automatique des handlers
 */
export class HandlerRegistry {
    private static handlers = new Map<any, HandlerMetadata>();

    static register(handlerClass: any, metadata: HandlerMetadata) {
        this.handlers.set(handlerClass, metadata);
        
        const queueInfo = metadata.queue ? 
            ` (Queue: ${metadata.queue.processing}, Priority: ${metadata.queue.priority || 'default'})` : 
            ' (Sync processing)';
            
        console.log(`[InjectableHandler] Handler '${metadata.name}' enregistré pour les événements: ${metadata.eventTypes.join(', ')}${queueInfo}`);
    }

    static getAll(): Map<any, HandlerMetadata> {
        return new Map(this.handlers);
    }

    static getByEventType(eventType: string): Array<{ class: any, metadata: HandlerMetadata }> {
        return Array.from(this.handlers.entries())
            .filter(([_, metadata]) => metadata.eventTypes.includes(eventType) || metadata.eventTypes.includes('*'))
            .map(([handlerClass, metadata]) => ({ class: handlerClass, metadata }));
    }

    static getQueuedHandlers(): Array<{ class: any, metadata: HandlerMetadata }> {
        return Array.from(this.handlers.entries())
            .filter(([_, metadata]) => metadata.queue && metadata.queue.processing !== 'sync')
            .map(([handlerClass, metadata]) => ({ class: handlerClass, metadata }));
    }
}

/**
 * Fonction utilitaire pour découvrir tous les handlers
 */
export function discoverEventHandlers(): Array<{ class: any, metadata: HandlerMetadata }> {
    return Array.from(HandlerRegistry.getAll().entries())
        .map(([handlerClass, metadata]) => ({ class: handlerClass, metadata }));
}

/**
 * Fonction utilitaire pour obtenir les métadonnées d'un handler
 */
export function getHandlerMetadata(handlerClass: any): HandlerMetadata | undefined {
    return HandlerRegistry.getAll().get(handlerClass);
}