import { Injectable } from '@nestjs/common';
import { 
    BaseTemplateProvider, 
    TemplateConfig,
    NotificationContext 
} from '@afidos/nestjs-event-notifications';

/**
 * Interface pour les données enrichies des webhooks
 */
interface WebhookEnrichedData {
    // Données originales
    [key: string]: any;
    
    // Métadonnées webhook
    timestamp: string;
    eventType: string;
    eventId: string;
    correlationId: string;
    version: string;
    
    // Headers de sécurité
    signature?: string;
    webhookId: string;
    
    // Informations d'entreprise
    source: string;
    environment: string;
}

/**
 * Provider de templates pour les webhooks utilisant des fonctions
 */
@Injectable()
@TemplateConfig({
    engine: 'simple',
    enableCache: false // Pas de cache pour les fonctions
})
export class WebhookTemplateProvider extends BaseTemplateProvider<any, WebhookEnrichedData> {
    
    /**
     * Enrichit les données pour les templates webhook
     */
    async enrichData(payload: any, context: NotificationContext): Promise<WebhookEnrichedData> {
        const baseData = this.createBaseEnrichedData(payload, context);
        
        return {
            ...baseData,
            
            // Métadonnées webhook standards
            timestamp: new Date().toISOString(),
            eventType: context.eventType,
            eventId: context.eventId,
            correlationId: context.correlationId,
            version: '1.0',
            
            // Identifiant unique du webhook
            webhookId: `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            
            // Informations source
            source: process.env.COMPANY_NAME || 'NotificationSystem',
            environment: process.env.NODE_ENV || 'development',
        };
    }
    
    /**
     * Rend le template en créant un payload webhook structuré
     */
    async renderTemplate(eventType: string, enrichedData: WebhookEnrichedData): Promise<string> {
        const payload = this.createWebhookPayload(eventType, enrichedData);
        return JSON.stringify(payload, null, 2);
    }
    
    /**
     * Crée un payload webhook standardisé selon le type d'événement
     */
    private createWebhookPayload(eventType: string, data: WebhookEnrichedData): any {
        const basePayload = {
            id: data.webhookId,
            type: eventType,
            timestamp: data.timestamp,
            version: data.version,
            source: data.source,
            environment: data.environment,
            correlation_id: data.correlationId,
            event_id: data.eventId,
            data: this.extractEventData(eventType, data),
            metadata: {
                retry_count: data.attempt || 0,
                created_at: data.timestamp,
                updated_at: data.timestamp
            }
        };

        return basePayload;
    }
    
    /**
     * Extrait les données spécifiques selon le type d'événement
     */
    private extractEventData(eventType: string, data: WebhookEnrichedData): any {
        switch (eventType) {
            case 'user.created':
                return this.extractUserCreatedData(data);
                
            case 'user.updated':
                return this.extractUserUpdatedData(data);
                
            case 'order.created':
                return this.extractOrderCreatedData(data);
                
            case 'order.shipped':
                return this.extractOrderShippedData(data);
                
            case 'order.delivered':
                return this.extractOrderDeliveredData(data);
                
            case 'system.error':
                return this.extractSystemErrorData(data);
                
            case 'system.maintenance':
                return this.extractSystemMaintenanceData(data);
                
            default:
                return this.extractDefaultData(data);
        }
    }
    
    /**
     * Données pour création d'utilisateur
     */
    private extractUserCreatedData(data: WebhookEnrichedData): any {
        return {
            user_id: data.id || data.userId,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            full_name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            status: 'active',
            created_at: data.timestamp
        };
    }
    
    /**
     * Données pour mise à jour d'utilisateur
     */
    private extractUserUpdatedData(data: WebhookEnrichedData): any {
        return {
            user_id: data.id || data.userId,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
            full_name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            updated_fields: data.updatedFields || [],
            updated_at: data.timestamp
        };
    }
    
    /**
     * Données pour création de commande
     */
    private extractOrderCreatedData(data: WebhookEnrichedData): any {
        return {
            order_id: data.id || data.orderId,
            customer_id: data.userId || data.customerId,
            customer_email: data.customerEmail || data.email,
            customer_name: data.customerName,
            total_amount: data.total,
            currency: data.currency || 'EUR',
            items_count: data.items || 1,
            status: 'created',
            created_at: data.timestamp
        };
    }
    
    /**
     * Données pour expédition de commande
     */
    private extractOrderShippedData(data: WebhookEnrichedData): any {
        return {
            order_id: data.id || data.orderId,
            customer_id: data.userId || data.customerId,
            tracking_number: data.trackingNumber,
            carrier: data.carrier,
            estimated_delivery: data.estimatedDelivery,
            status: 'shipped',
            shipped_at: data.timestamp
        };
    }
    
    /**
     * Données pour livraison de commande
     */
    private extractOrderDeliveredData(data: WebhookEnrichedData): any {
        return {
            order_id: data.id || data.orderId,
            customer_id: data.userId || data.customerId,
            tracking_number: data.trackingNumber,
            delivery_date: data.deliveryDate || data.timestamp,
            status: 'delivered',
            delivered_at: data.timestamp
        };
    }
    
    /**
     * Données pour erreur système
     */
    private extractSystemErrorData(data: WebhookEnrichedData): any {
        return {
            error_id: data.errorId || data.incidentId,
            error_code: data.errorCode,
            error_message: data.message || data.description,
            severity: data.severity || 'high',
            affected_services: data.affectedServices || [],
            status: 'investigating',
            occurred_at: data.timestamp
        };
    }
    
    /**
     * Données pour maintenance système
     */
    private extractSystemMaintenanceData(data: WebhookEnrichedData): any {
        return {
            maintenance_id: data.maintenanceId,
            title: data.title || 'Maintenance programmée',
            description: data.description || data.reason,
            start_time: data.startTime,
            end_time: data.endTime,
            duration: data.duration,
            affected_services: data.affectedServices || [],
            status: 'scheduled',
            scheduled_at: data.timestamp
        };
    }
    
    /**
     * Données par défaut
     */
    private extractDefaultData(data: WebhookEnrichedData): any {
        // Exclure les métadonnées internes et ne garder que les données utiles
        const {
            timestamp, eventType, eventId, correlationId, version,
            webhookId, source, environment, attempt, retryCount,
            ...eventData
        } = data;
        
        return {
            ...eventData,
            processed_at: timestamp
        };
    }
    
    /**
     * Crée les headers de sécurité pour le webhook
     */
    createSecurityHeaders(payload: string, secret?: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': `${process.env.COMPANY_NAME || 'NotificationSystem'}-Webhook/1.0`
        };
        
        if (secret) {
            // Générer une signature HMAC pour la sécurité
            const crypto = require('crypto');
            const signature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');
            
            headers['X-Webhook-Signature'] = `sha256=${signature}`;
        }
        
        headers['X-Webhook-Timestamp'] = Date.now().toString();
        
        return headers;
    }
    
    /**
     * Obtient la liste des templates disponibles (utilise la méthode de la classe de base)
     */
    async getAvailableTemplates(): Promise<string[]> {
        return [
            'user.created',
            'user.updated',
            'order.created', 
            'order.shipped',
            'order.delivered',
            'system.maintenance',
            'system.error'
        ];
    }

    /**
     * Vérifie si un template existe pour un événement
     */
    async hasTemplate(eventType: string): Promise<boolean> {
        const availableTemplates = await this.getAvailableTemplates();
        return availableTemplates.includes(eventType);
    }

    /**
     * Vide le cache des templates (utilise la méthode de la classe de base)
     */
    clearCache(): void {
        super.clearTemplateCache();
    }
}