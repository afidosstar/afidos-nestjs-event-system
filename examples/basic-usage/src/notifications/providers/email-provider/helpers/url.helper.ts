/**
 * Helper pour la génération d'URLs
 */
export class UrlHelper {
    
    private static baseUrl = process.env.APP_URL || 'http://localhost:3000';
    private static trackingBaseUrl = process.env.TRACKING_URL || 'https://tracking.example.com';
    
    /**
     * Génère l'URL de l'application
     */
    static appUrl(path: string = ''): string {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${this.baseUrl}${cleanPath}`;
    }
    
    /**
     * Génère l'URL de tracking pour un colis
     */
    static trackingUrl(trackingNumber: string): string {
        if (!trackingNumber) return '#';
        return `${this.trackingBaseUrl}/track/${trackingNumber}`;
    }
    
    /**
     * Génère l'URL de connexion
     */
    static loginUrl(): string {
        return this.appUrl('/login');
    }
    
    /**
     * Génère l'URL du profil utilisateur
     */
    static profileUrl(userId?: string | number): string {
        if (userId) {
            return this.appUrl(`/profile/${userId}`);
        }
        return this.appUrl('/profile');
    }
    
    /**
     * Génère l'URL de détail d'une commande
     */
    static orderUrl(orderId: string | number): string {
        return this.appUrl(`/orders/${orderId}`);
    }
    
    /**
     * Génère l'URL de désabonnement
     */
    static unsubscribeUrl(userId: string | number, token?: string): string {
        const params = token ? `?token=${token}` : '';
        return this.appUrl(`/unsubscribe/${userId}${params}`);
    }
    
    /**
     * Génère l'URL du support
     */
    static supportUrl(): string {
        return this.appUrl('/support');
    }
}