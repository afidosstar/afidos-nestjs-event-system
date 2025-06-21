/**
 * Helper pour la génération d'URLs dans les messages Telegram
 */
export class TelegramUrlHelper {
    
    /**
     * URL de base de l'application
     */
    static appUrl(path?: string): string {
        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        return path ? `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}` : baseUrl;
    }
    
    /**
     * URL de suivi de commande
     */
    static trackingUrl(trackingNumber: string): string {
        if (!trackingNumber || trackingNumber === 'N/A') {
            return 'Numéro de suivi non disponible';
        }
        
        const baseTrackingUrl = process.env.TRACKING_URL || 'https://www.colis-prive.com/suivre-mon-colis';
        return `${baseTrackingUrl}?tracking=${encodeURIComponent(trackingNumber)}`;
    }
    
    /**
     * URL de connexion
     */
    static loginUrl(): string {
        return this.appUrl('/login');
    }
    
    /**
     * URL du profil utilisateur
     */
    static profileUrl(userId?: string | number): string {
        if (!userId) return this.appUrl('/profile');
        return this.appUrl(`/profile/${userId}`);
    }
    
    /**
     * URL de détail de commande
     */
    static orderUrl(orderId: string | number): string {
        return this.appUrl(`/orders/${orderId}`);
    }
    
    /**
     * URL de désabonnement
     */
    static unsubscribeUrl(userId: string | number, token?: string): string {
        const baseUrl = this.appUrl(`/unsubscribe/${userId}`);
        return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
    }
    
    /**
     * URL du support
     */
    static supportUrl(): string {
        return this.appUrl('/support');
    }
    
    /**
     * Formate une URL en lien Telegram cliquable
     */
    static formatTelegramLink(url: string, text?: string): string {
        if (!url) return '';
        
        // Si pas de texte, utiliser l'URL
        const linkText = text || url;
        
        // Format Telegram: <a href="url">text</a>
        return `<a href="${url}">${linkText}</a>`;
    }
    
    /**
     * Formate un numéro de téléphone en lien cliquable
     */
    static formatPhoneLink(phone: string | undefined): string {
        if (!phone) return '';
        
        const cleanPhone = phone.replace(/\D/g, '');
        return `<a href="tel:${cleanPhone}">${phone}</a>`;
    }
    
    /**
     * Formate un email en lien cliquable
     */
    static formatEmailLink(email: string | undefined): string {
        if (!email) return '';
        
        return `<a href="mailto:${email}">${email}</a>`;
    }
    
    /**
     * Crée un lien vers un chat Telegram
     */
    static formatTelegramChatLink(username: string): string {
        if (!username) return '';
        
        const cleanUsername = username.replace('@', '');
        return `<a href="https://t.me/${cleanUsername}">@${cleanUsername}</a>`;
    }
    
    /**
     * URL de partage Telegram
     */
    static shareUrl(text: string, url?: string): string {
        const shareText = encodeURIComponent(text);
        const shareUrl = url ? encodeURIComponent(url) : '';
        
        if (shareUrl) {
            return `https://t.me/share/url?url=${shareUrl}&text=${shareText}`;
        }
        
        return `https://t.me/share/url?text=${shareText}`;
    }
}