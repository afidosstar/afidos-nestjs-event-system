/**
 * Helper pour le formatage de données Telegram
 */
export class TelegramFormatHelper {
    
    /**
     * Formate un prix en euros pour Telegram
     */
    static formatPrice(price: number | string | undefined): string {
        if (price === undefined || price === null) return '0,00€';
        
        const numPrice = typeof price === 'string' ? parseFloat(price) : price;
        
        if (isNaN(numPrice)) return '0,00€';
        
        return numPrice.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + '€';
    }
    
    /**
     * Formate un objet JSON pour Telegram (avec code)
     */
    static formatJson(obj: any): string {
        if (!obj) return '';
        
        try {
            return `<pre>${JSON.stringify(obj, null, 2)}</pre>`;
        } catch (error) {
            return `<code>${String(obj)}</code>`;
        }
    }
    
    /**
     * Capitalise la première lettre d'une chaîne
     */
    static capitalize(str: string | undefined): string {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    
    /**
     * Tronque un texte à une longueur donnée pour Telegram
     */
    static truncate(text: string | undefined, length: number = 200): string {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }
    
    /**
     * Formate un numéro de téléphone
     */
    static formatPhone(phone: string | undefined): string {
        if (!phone) return '';
        
        // Supprime tous les caractères non numériques
        const cleaned = phone.replace(/\D/g, '');
        
        // Formate au format français si possible
        if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
        }
        
        return phone;
    }
    
    /**
     * Échappe les caractères spéciaux HTML pour Telegram
     */
    static escapeHtml(text: string | undefined): string {
        if (!text) return '';
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    
    /**
     * Formate un username Telegram
     */
    static formatUsername(username: string | undefined): string {
        if (!username) return '';
        
        // Ajouter @ si pas déjà présent
        return username.startsWith('@') ? username : `@${username}`;
    }
    
    /**
     * Formate un code de suivi pour Telegram
     */
    static formatTrackingCode(code: string | undefined): string {
        if (!code) return 'N/A';
        
        return `<code>${code}</code>`;
    }
}