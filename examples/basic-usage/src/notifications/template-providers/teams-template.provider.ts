import { Injectable } from '@nestjs/common';
import { 
    BaseTemplateProvider, 
    TemplateConfig,
    NotificationContext 
} from '@afidos/nestjs-event-notifications';

/**
 * Interface pour les données enrichies des Teams
 */
interface TeamsEnrichedData {
    // Données originales
    [key: string]: any;
    
    // Données enrichies
    userName: string;
    appUrl: string;
    currentDate: string;
    companyName: string;
    supportUrl: string;
    
    // Informations Teams
    themeColor: string;
    activityTitle: string;
    activitySubtitle: string;
}

/**
 * Provider de templates pour Microsoft Teams utilisant des fonctions
 */
@Injectable()
@TemplateConfig({
    engine: 'simple',
    enableCache: false // Pas de cache pour les fonctions
})
export class TeamsTemplateProvider extends BaseTemplateProvider<any, TeamsEnrichedData> {
    
    /**
     * Enrichit les données pour les templates Teams
     */
    async enrichData(payload: any, context: NotificationContext): Promise<TeamsEnrichedData> {
        const baseData = this.createBaseEnrichedData(payload, context);
        
        return {
            ...baseData,
            
            // Nom d'utilisateur
            userName: this.extractUserName(payload),
            
            // URLs
            appUrl: process.env.APP_URL || 'http://localhost:3000',
            supportUrl: `${process.env.APP_URL || 'http://localhost:3000'}/support`,
            
            // Date
            currentDate: new Date().toLocaleDateString('fr-FR'),
            
            // Informations entreprise
            companyName: process.env.COMPANY_NAME || 'Notre Entreprise',
            
            // Couleur selon le type d'événement
            themeColor: this.getThemeColor(context.eventType),
            
            // Titre et sous-titre de l'activité
            activityTitle: this.getActivityTitle(context.eventType, payload),
            activitySubtitle: this.getActivitySubtitle(context.eventType, payload),
        };
    }
    
    /**
     * Rend le template en créant un message Teams (Adaptive Card)
     */
    async renderTemplate(eventType: string, enrichedData: TeamsEnrichedData): Promise<string> {
        const card = this.createTeamsCard(eventType, enrichedData);
        return JSON.stringify(card, null, 2);
    }
    
    /**
     * Crée une Adaptive Card pour Teams selon le type d'événement
     */
    private createTeamsCard(eventType: string, data: TeamsEnrichedData): any {
        const baseCard = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": data.themeColor,
            "summary": data.activityTitle,
            "sections": [
                {
                    "activityTitle": data.activityTitle,
                    "activitySubtitle": data.activitySubtitle,
                    "activityImage": this.getActivityImage(eventType),
                    "facts": this.getEventFacts(eventType, data),
                    "markdown": true
                }
            ],
            "potentialAction": this.getActions(eventType, data)
        };

        return baseCard;
    }
    
    /**
     * Obtient la couleur du thème selon le type d'événement
     */
    private getThemeColor(eventType: string): string {
        const colors: Record<string, string> = {
            'user.created': '00FF00',      // Vert
            'order.created': '0078D4',     // Bleu
            'order.shipped': '00BCF2',     // Bleu clair
            'system.error': 'FF0000',      // Rouge
            'system.maintenance': 'FFA500' // Orange
        };
        
        return colors[eventType] || '6264A7'; // Violet Teams par défaut
    }
    
    /**
     * Obtient l'image d'activité selon le type d'événement
     */
    private getActivityImage(eventType: string): string {
        const images: Record<string, string> = {
            'user.created': 'https://img.icons8.com/color/48/000000/user.png',
            'order.created': 'https://img.icons8.com/color/48/000000/shopping-cart.png',
            'order.shipped': 'https://img.icons8.com/color/48/000000/truck.png',
            'system.error': 'https://img.icons8.com/color/48/000000/error.png',
            'system.maintenance': 'https://img.icons8.com/color/48/000000/maintenance.png'
        };
        
        return images[eventType] || 'https://img.icons8.com/color/48/000000/notification.png';
    }
    
    /**
     * Obtient le titre de l'activité
     */
    private getActivityTitle(eventType: string, data: any): string {
        const titles: Record<string, string> = {
            'user.created': `🎉 Nouvel utilisateur : ${data.userName || 'Utilisateur'}`,
            'order.created': `📦 Nouvelle commande #${data.id || data.orderId || 'N/A'}`,
            'order.shipped': `🚚 Commande expédiée #${data.id || data.orderId || 'N/A'}`,
            'system.error': `🚨 Erreur système détectée`,
            'system.maintenance': `🔧 Maintenance programmée`
        };
        
        return titles[eventType] || `📱 Notification: ${eventType}`;
    }
    
    /**
     * Obtient le sous-titre de l'activité
     */
    private getActivitySubtitle(eventType: string, data: any): string {
        const subtitles: Record<string, string> = {
            'user.created': `Compte créé le ${data.currentDate}`,
            'order.created': `Commande confirmée • ${data.total ? data.total + '€' : 'Montant N/A'}`,
            'order.shipped': `Expédiée le ${data.currentDate} • ${data.carrier || 'Transporteur N/A'}`,
            'system.error': `Incident détecté le ${data.currentDate}`,
            'system.maintenance': `Planifiée pour le ${data.maintenanceDate || data.currentDate}`
        };
        
        return subtitles[eventType] || `Notification envoyée le ${data.currentDate}`;
    }
    
    /**
     * Obtient les faits (key-value pairs) pour l'événement
     */
    private getEventFacts(eventType: string, data: TeamsEnrichedData): any[] {
        switch (eventType) {
            case 'user.created':
                return [
                    { name: 'Email', value: data.userEmail || data.email || 'N/A' },
                    { name: 'Date de création', value: data.currentDate },
                    { name: 'ID utilisateur', value: data.id || data.userId || 'N/A' }
                ];
                
            case 'order.created':
                return [
                    { name: 'Client', value: data.customerName || data.userName || 'N/A' },
                    { name: 'Montant', value: data.total ? `${data.total}€` : 'N/A' },
                    { name: 'Articles', value: data.items || 'N/A' },
                    { name: 'Date', value: data.currentDate }
                ];
                
            case 'order.shipped':
                return [
                    { name: 'Transporteur', value: data.carrier || 'N/A' },
                    { name: 'N° de suivi', value: data.trackingNumber || 'N/A' },
                    { name: 'Livraison estimée', value: data.estimatedDelivery || 'N/A' },
                    { name: 'Date d\'expédition', value: data.currentDate }
                ];
                
            case 'system.error':
                return [
                    { name: 'Type d\'erreur', value: data.errorCode || data.severity || 'N/A' },
                    { name: 'Description', value: data.message || data.description || 'N/A' },
                    { name: 'Services impactés', value: data.affectedServices?.join(', ') || 'N/A' },
                    { name: 'Date détection', value: data.currentDate }
                ];
                
            case 'system.maintenance':
                return [
                    { name: 'Début', value: data.startTime || 'N/A' },
                    { name: 'Fin estimée', value: data.endTime || 'N/A' },
                    { name: 'Durée', value: data.duration || 'N/A' },
                    { name: 'Services concernés', value: data.affectedServices?.join(', ') || 'N/A' }
                ];
                
            default:
                return [
                    { name: 'Type d\'événement', value: eventType },
                    { name: 'Date', value: data.currentDate },
                    { name: 'ID événement', value: data.eventId }
                ];
        }
    }
    
    /**
     * Obtient les actions possibles pour l'événement
     */
    private getActions(eventType: string, data: TeamsEnrichedData): any[] {
        const actions = [
            {
                "@type": "OpenUri",
                "name": "Voir les détails",
                "targets": [
                    {
                        "os": "default",
                        "uri": this.getDetailsUrl(eventType, data)
                    }
                ]
            }
        ];
        
        // Ajouter une action spécifique selon le type
        switch (eventType) {
            case 'user.created':
                actions.push({
                    "@type": "OpenUri",
                    "name": "Voir le profil",
                    "targets": [{ "os": "default", "uri": `${data.appUrl}/users/${data.id || data.userId}` }]
                });
                break;
                
            case 'order.created':
            case 'order.shipped':
                actions.push({
                    "@type": "OpenUri",
                    "name": "Suivre la commande",
                    "targets": [{ "os": "default", "uri": `${data.appUrl}/orders/${data.id || data.orderId}` }]
                });
                break;
                
            case 'system.error':
            case 'system.maintenance':
                actions.push({
                    "@type": "OpenUri",
                    "name": "Statut des services",
                    "targets": [{ "os": "default", "uri": `${data.appUrl}/status` }]
                });
                break;
        }
        
        return actions;
    }
    
    /**
     * Obtient l'URL des détails selon le type d'événement
     */
    private getDetailsUrl(eventType: string, data: TeamsEnrichedData): string {
        const paths: Record<string, string> = {
            'user.created': `/users/${data.id || data.userId}`,
            'order.created': `/orders/${data.id || data.orderId}`,
            'order.shipped': `/orders/${data.id || data.orderId}/tracking`,
            'system.error': '/status',
            'system.maintenance': '/status'
        };
        
        const path = paths[eventType] || `/notifications/${data.eventId}`;
        return `${data.appUrl}${path}`;
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
        
        return payload.email || payload.user?.email || 'Utilisateur';
    }
    
    /**
     * Obtient la liste des templates disponibles
     */
    async getAvailableTemplates(): Promise<string[]> {
        return [
            'user.created',
            'order.created', 
            'order.shipped',
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
     * Vide le cache des templates
     */
    clearCache(): void {
        super.clearTemplateCache();
    }
}