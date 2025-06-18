import { Injectable } from '@nestjs/common';
import { InjectableHandler, EventHandler, EventHandlerContext } from '@afidos/nestjs-event-notifications';

@InjectableHandler({
    name: 'AuditLogHandler',
    eventTypes: ['*'], // Écoute tous les événements
    priority: 200, // Priorité élevée pour l'audit
    description: 'Enregistre tous les événements dans les logs d\'audit',
    // Pas de configuration de queue = traitement synchrone
})
@Injectable()
export class AuditLogHandler implements EventHandler {
    getName(): string {
        return 'AuditLogHandler';
    }

    getEventTypes(): string[] {
        return ['*']; // Traite tous les événements
    }

    getPriority(): number {
        return 200; // Priorité très élevée
    }

    canHandle(eventType: string): boolean {
        // Accepte tous les événements
        return true;
    }

    async execute(eventType: string, payload: any, context: EventHandlerContext): Promise<any> {
        // Traitement synchrone rapide pour l'audit
        const auditEntry = {
            timestamp: new Date(),
            eventType,
            eventId: context.eventId,
            correlationId: context.correlationId,
            payload: this.sanitizePayload(payload),
            source: 'event-system',
            severity: this.getSeverityLevel(eventType)
        };

        // Simulation de l'écriture dans les logs d'audit
        console.log('[AUDIT LOG]', JSON.stringify(auditEntry, null, 2));

        return {
            audited: true,
            auditId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: auditEntry.timestamp
        };
    }

    async isHealthy(): Promise<boolean> {
        // L'audit est toujours disponible tant que l'application fonctionne
        return true;
    }

    /**
     * Nettoie le payload pour éviter de logger des informations sensibles
     */
    private sanitizePayload(payload: any): any {
        if (!payload || typeof payload !== 'object') {
            return payload;
        }

        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
        const sanitized = { ...payload };

        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * Détermine le niveau de sévérité selon le type d'événement
     */
    private getSeverityLevel(eventType: string): 'info' | 'warning' | 'error' | 'critical' {
        if (eventType.includes('error') || eventType.includes('failed')) {
            return 'error';
        }
        if (eventType.includes('warning') || eventType.includes('retry')) {
            return 'warning';
        }
        if (eventType.includes('critical') || eventType.includes('security')) {
            return 'critical';
        }
        return 'info';
    }
}