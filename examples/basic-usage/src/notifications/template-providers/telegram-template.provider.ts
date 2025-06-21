import { Injectable } from '@nestjs/common';
import { 
    BaseTemplateProvider, 
    TemplateConfig,
    NotificationContext 
} from '@afidos/nestjs-event-notifications';

/**
 * Interface pour les données enrichies des Telegram
 */
interface TelegramEnrichedData {
    // Données originales
    [key: string]: any;
    
    // Données enrichies
    userName: string;
    shortUrl: string;
    currentDate: string;
    companyName: string;
    supportUrl: string;
}

/**
 * Provider de templates pour Telegram utilisant des fonctions
 */
@Injectable()
@TemplateConfig({
    engine: 'simple',
    enableCache: false // Pas de cache pour les fonctions
})
export class TelegramTemplateProvider extends BaseTemplateProvider<any, TelegramEnrichedData> {
    
    /**
     * Enrichit les données pour les templates Telegram
     */
    async enrichData(payload: any, context: NotificationContext): Promise<TelegramEnrichedData> {
        const baseData = this.createBaseEnrichedData(payload, context);
        
        return {
            ...baseData,
            
            // Nom court pour Telegram
            userName: this.extractUserName(payload),
            
            // URL raccourcie (simulée)
            shortUrl: this.createShortUrl(payload, context.eventType),
            
            // Date courte
            currentDate: new Date().toLocaleDateString('fr-FR'),
            
            // Informations entreprise
            companyName: process.env.COMPANY_SHORT_NAME || 'NotifApp',
            supportUrl: `${process.env.APP_URL || 'http://localhost:3000'}/support`,
        };
    }
    
    /**
     * Rend le template en utilisant des fonctions
     */
    async renderTemplate(eventType: string, enrichedData: TelegramEnrichedData): Promise<string> {
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
    private renderUserCreated(data: TelegramEnrichedData): string {
        return `🎉 <b>Bienvenue ${data.userName} !</b>

Votre compte <b>${data.companyName}</b> a été créé avec succès le ${data.currentDate}.

📧 Email : ${data.userEmail || 'Non renseigné'}
🆔 ID : ${data.eventId}

Vous pouvez maintenant accéder à votre espace personnel.

<a href="${data.shortUrl}">Accéder à mon profil</a>

Merci de nous faire confiance ! 
L'équipe ${data.companyName}`;
    }
    
    /**
     * Template pour création de commande
     */
    private renderOrderCreated(data: TelegramEnrichedData): string {
        const orderId = data.id || data.orderId || 'N/A';
        const total = data.total ? ` (${data.total}€)` : '';
        
        return `📦 <b>Commande confirmée !</b>

<b>${data.companyName}</b> - Commande #${orderId}${total}

📅 Date : ${data.currentDate}
${data.items ? `📋 Articles : ${data.items}` : ''}

Votre commande sera traitée dans les plus brefs délais.

<a href="${data.shortUrl}">Suivre ma commande</a>

L'équipe ${data.companyName}`;
    }
    
    /**
     * Template pour expédition de commande
     */
    private renderOrderShipped(data: TelegramEnrichedData): string {
        const orderId = data.id || data.orderId || 'N/A';
        const tracking = data.trackingNumber ? `\n📍 Suivi : <code>${data.trackingNumber}</code>` : '';
        
        return `🚚 <b>Commande expédiée !</b>

<b>${data.companyName}</b> - Commande #${orderId}

📅 Expédiée le : ${data.currentDate}${tracking}
${data.carrier ? `🚛 Transporteur : ${data.carrier}` : ''}

Votre colis est en route !

<a href="${data.shortUrl}">Suivre mon colis</a>

L'équipe ${data.companyName}`;
    }
    
    /**
     * Template pour maintenance système
     */
    private renderSystemMaintenance(data: TelegramEnrichedData): string {
        const duration = data.duration ? ` (${data.duration})` : '';
        
        return `🔧 <b>Maintenance programmée</b>

<b>${data.companyName}</b>

📅 Date : ${data.maintenanceDate || data.currentDate}${duration}
${data.startTime ? `⏰ Début : ${data.startTime}` : ''}

Certains services pourront être temporairement indisponibles.

<a href="${data.shortUrl}">Plus d'informations</a>

Merci pour votre compréhension.
L'équipe ${data.companyName}`;
    }
    
    /**
     * Template pour erreur système
     */
    private renderSystemError(data: TelegramEnrichedData): string {
        return `🚨 <b>Incident technique</b>

<b>${data.companyName}</b>

Un incident technique a été détecté le ${data.currentDate}.
${data.incidentId ? `🆔 Référence : ${data.incidentId}` : ''}

Notre équipe technique travaille activement à la résolution.

<a href="${data.shortUrl}">Statut en temps réel</a>

Merci pour votre patience.
L'équipe ${data.companyName}`;
    }
    
    /**
     * Template par défaut
     */
    private renderDefault(eventType: string, data: TelegramEnrichedData): string {
        return `📱 <b>Notification</b>

<b>${data.companyName}</b> - ${eventType}

📅 ${data.currentDate}

<a href="${data.shortUrl}">Plus de détails</a>

L'équipe ${data.companyName}`;
    }
    
    /**
     * Extrait le nom d'utilisateur depuis le payload
     */
    private extractUserName(payload: any): string {
        if (payload.firstName && payload.lastName) {
            return `${payload.firstName} ${payload.lastName}`;
        }
        
        if (payload.name) {
            return payload.name;
        }
        
        if (payload.user?.name) {
            return payload.user.name;
        }
        
        if (payload.user?.firstName && payload.user?.lastName) {
            return `${payload.user.firstName} ${payload.user.lastName}`;
        }
        
        // Nom court pour Telegram
        const name = payload.email || payload.user?.email || 'Utilisateur';
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
    }
    
    /**
     * Crée une URL raccourcie (simulée)
     */
    private createShortUrl(payload: any, eventType: string): string {
        const baseUrl = process.env.SHORT_URL_BASE || process.env.APP_URL || 'http://localhost:3000';
        const id = payload.id || payload.orderId || payload.userId || 'def';
        const path = this.getEventPath(eventType, id);
        return `${baseUrl}${path}`;
    }
    
    /**
     * Génère le chemin approprié selon le type d'événement
     */
    private getEventPath(eventType: string, id: string): string {
        const pathMap: Record<string, string> = {
            'user.created': `/profile`,
            'order.created': `/orders/${id}`,
            'order.shipped': `/orders/${id}/tracking`,
            'system.maintenance': `/status`,
            'system.error': `/status`
        };
        
        return pathMap[eventType] || `/notifications/${id}`;
    }

    /**
     * Obtient la liste des templates disponibles (utilise la méthode de la classe de base)
     */
    async getAvailableTemplates(): Promise<string[]> {
        return super.getAvailableTemplates();
    }

    /**
     * Vérifie si un template existe pour un événement (utilise la méthode de la classe de base)
     */
    async hasTemplate(eventType: string): Promise<boolean> {
        return super.hasTemplate(eventType);
    }

    /**
     * Vide le cache des templates (utilise la méthode de la classe de base)
     */
    clearCache(): void {
        super.clearTemplateCache();
    }
}