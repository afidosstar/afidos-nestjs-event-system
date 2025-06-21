import { Injectable } from '@nestjs/common';
import { 
    BaseTemplateProvider, 
    TemplateConfig,
    NotificationContext 
} from '@afidos/nestjs-event-notifications';

/**
 * Interface pour les données enrichies des SMS
 */
interface SmsEnrichedData {
    // Données originales
    [key: string]: any;
    
    // Données enrichies
    userName: string;
    shortUrl: string;
    currentDate: string;
    companyName: string;
    supportPhone: string;
}

/**
 * Provider de templates pour les SMS utilisant des fonctions
 */
@Injectable()
@TemplateConfig({
    engine: 'simple',
    enableCache: false // Pas de cache pour les fonctions
})
export class SmsTemplateProvider extends BaseTemplateProvider<any, SmsEnrichedData> {
    
    /**
     * Enrichit les données pour les templates SMS
     */
    async enrichData(payload: any, context: NotificationContext): Promise<SmsEnrichedData> {
        const baseData = this.createBaseEnrichedData(payload, context);
        
        return {
            ...baseData,
            
            // Nom court pour SMS
            userName: this.extractShortUserName(payload),
            
            // URL raccourcie (simulée)
            shortUrl: this.createShortUrl(payload, context.eventType),
            
            // Date courte
            currentDate: new Date().toLocaleDateString('fr-FR'),
            
            // Informations entreprise
            companyName: process.env.COMPANY_SHORT_NAME || 'NotifApp',
            supportPhone: process.env.SUPPORT_PHONE || '0123456789',
        };
    }
    
    /**
     * Rend le template en utilisant des fonctions
     */
    async renderTemplate(eventType: string, enrichedData: SmsEnrichedData): Promise<string> {
        switch (eventType) {
            case 'user.created':
                return this.renderUserCreated(enrichedData);
                
            case 'order.created':
                return this.renderOrderCreated(enrichedData);
                
            case 'order.shipped':
                return this.renderOrderShipped(enrichedData);
                
            case 'system.maintenance':
                return this.renderSystemMaintenance(enrichedData);
                
            case 'system.error':
                return this.renderSystemError(enrichedData);
                
            default:
                return this.renderDefault(eventType, enrichedData);
        }
    }
    
    /**
     * Template pour création d'utilisateur
     */
    private renderUserCreated(data: SmsEnrichedData): string {
        return `🎉 Bienvenue ${data.userName} ! Votre compte ${data.companyName} est créé. Connectez-vous: ${data.shortUrl}`;
    }
    
    /**
     * Template pour création de commande
     */
    private renderOrderCreated(data: SmsEnrichedData): string {
        const orderId = data.id || data.orderId || 'N/A';
        const total = data.total ? ` (${data.total}€)` : '';
        return `📦 ${data.companyName}: Commande #${orderId}${total} confirmée. Suivi: ${data.shortUrl}`;
    }
    
    /**
     * Template pour expédition de commande
     */
    private renderOrderShipped(data: SmsEnrichedData): string {
        const orderId = data.id || data.orderId || 'N/A';
        const tracking = data.trackingNumber ? ` Suivi: ${data.trackingNumber}` : '';
        return `🚚 ${data.companyName}: Commande #${orderId} expédiée !${tracking} Détails: ${data.shortUrl}`;
    }
    
    /**
     * Template pour maintenance système
     */
    private renderSystemMaintenance(data: SmsEnrichedData): string {
        const duration = data.duration ? ` (${data.duration})` : '';
        return `🔧 ${data.companyName}: Maintenance programmée${duration}. Plus d'infos: ${data.shortUrl}`;
    }
    
    /**
     * Template pour erreur système
     */
    private renderSystemError(data: SmsEnrichedData): string {
        return `🚨 ${data.companyName}: Incident technique détecté. Notre équipe intervient. Infos: ${data.shortUrl}`;
    }
    
    /**
     * Template par défaut
     */
    private renderDefault(eventType: string, data: SmsEnrichedData): string {
        return `📱 ${data.companyName}: Notification ${eventType}. Détails: ${data.shortUrl}`;
    }
    
    /**
     * Extrait un nom court pour SMS (limite de caractères)
     */
    private extractShortUserName(payload: any): string {
        let name = '';
        
        if (payload.firstName) {
            name = payload.firstName;
        } else if (payload.name) {
            name = payload.name.split(' ')[0]; // Premier mot seulement
        } else if (payload.user?.firstName) {
            name = payload.user.firstName;
        } else if (payload.user?.name) {
            name = payload.user.name.split(' ')[0];
        } else {
            name = 'Utilisateur';
        }
        
        // Limiter à 15 caractères pour SMS
        return name.length > 15 ? name.substring(0, 15) + '...' : name;
    }
    
    /**
     * Crée une URL raccourcie (simulée)
     */
    private createShortUrl(payload: any, eventType: string): string {
        const baseUrl = process.env.SHORT_URL_BASE || 'https://app.ly';
        const id = payload.id || payload.orderId || payload.userId || 'def';
        const code = this.generateShortCode(eventType, id);
        return `${baseUrl}/${code}`;
    }
    
    /**
     * Génère un code court pour l'URL
     */
    private generateShortCode(eventType: string, id: string): string {
        const typeMap: Record<string, string> = {
            'user.created': 'u',
            'order.created': 'o',
            'order.shipped': 's',
            'system.maintenance': 'm',
            'system.error': 'e'
        };
        
        const prefix = typeMap[eventType] || 'n';
        const shortId = id.toString().slice(-4); // 4 derniers caractères
        return `${prefix}${shortId}`;
    }
}