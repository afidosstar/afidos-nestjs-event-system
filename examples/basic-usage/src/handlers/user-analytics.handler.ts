import { Injectable } from '@nestjs/common';
import { InjectableHandler, EventHandler, EventHandlerContext } from '@afidos/nestjs-event-notifications';

@InjectableHandler({
    name: 'UserAnalyticsHandler',
    eventTypes: ['user.created', 'user.updated'],
    priority: 100,
    description: 'Traite les événements utilisateur pour les analytics',
    queue: {
        processing: 'async',
        priority: 8,
        retry: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000
            }
        },
        timeout: 10000,
        concurrency: 2,
        redis: {
            keyPrefix: 'analytics:',
            jobTTL: 7200
        }
    }
})
@Injectable()
export class UserAnalyticsHandler implements EventHandler {
    getName(): string {
        return 'UserAnalyticsHandler';
    }

    getEventTypes(): string[] {
        return ['user.created', 'user.updated'];
    }

    getPriority(): number {
        return 100;
    }

    canHandle(eventType: string): boolean {
        return this.getEventTypes().includes(eventType);
    }

    async beforeQueue(eventType: string, payload: any, context: EventHandlerContext): Promise<void> {
        console.log(`[Analytics] Mise en queue de ${eventType} pour l'utilisateur ${payload.userId || payload.id}`);
    }

    async execute(eventType: string, payload: any, context: EventHandlerContext): Promise<any> {
        console.log(`[Analytics] Traitement de l'événement ${eventType} pour l'utilisateur ${payload.userId || payload.id}`);
        
        // Simulation d'un traitement d'analytics
        await this.simulateAnalyticsProcessing();
        
        switch (eventType) {
            case 'user.created':
                return await this.trackUserCreation(payload);
            case 'user.updated':
                return await this.trackUserUpdate(payload);
            default:
                throw new Error(`Type d'événement ${eventType} non supporté`);
        }
    }

    async afterExecute(eventType: string, payload: any, result: any, context: EventHandlerContext): Promise<void> {
        console.log(`[Analytics] Traitement terminé pour ${eventType} - utilisateur ${payload.userId || payload.id}`);
    }

    async onError(error: Error, eventType: string, payload: any, context: EventHandlerContext): Promise<void> {
        console.error(`[Analytics] Erreur lors du traitement de ${eventType} pour l'utilisateur ${payload.userId || payload.id}: ${error.message}`);
        
        // Logique de gestion d'erreur spécifique
        if (context.attempt >= 3) {
            // Envoyer une alerte après le dernier échec
            await this.sendFailureAlert(eventType, payload, error);
        }
    }

    async isHealthy(): Promise<boolean> {
        // Vérification de santé du service analytics
        try {
            await this.checkAnalyticsService();
            return true;
        } catch (error) {
            return false;
        }
    }

    private async simulateAnalyticsProcessing(): Promise<void> {
        // Simulation d'un traitement qui prend du temps
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    private async trackUserCreation(payload: any) {
        return { 
            tracked: true, 
            type: 'creation', 
            userId: payload.userId || payload.id, 
            timestamp: new Date(),
            email: payload.email 
        };
    }

    private async trackUserUpdate(payload: any) {
        return { 
            tracked: true, 
            type: 'update', 
            userId: payload.userId || payload.id, 
            timestamp: new Date(),
            fields: payload.updatedFields || [] 
        };
    }

    private async checkAnalyticsService(): Promise<void> {
        // Vérification de la connectivité au service analytics
        // Pour la démo, on simule une vérification réussie
    }

    private async sendFailureAlert(eventType: string, payload: any, error: Error): Promise<void> {
        // Envoi d'alerte en cas d'échec définitif
        console.error(`ALERT: Échec du traitement de ${eventType} pour l'utilisateur ${payload.userId || payload.id} après toutes les tentatives: ${error.message}`);
    }
}