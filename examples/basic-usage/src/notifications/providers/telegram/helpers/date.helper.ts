/**
 * Helper pour le formatage des dates dans Telegram
 */
export class TelegramDateHelper {
    
    /**
     * Formate une date en français pour Telegram
     */
    static formatDate(date: string | Date | undefined): string {
        if (!date) return 'Date non disponible';
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        if (isNaN(dateObj.getTime())) {
            return 'Date invalide';
        }
        
        return dateObj.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    /**
     * Formate une date courte pour Telegram
     */
    static formatDateShort(date: string | Date | undefined): string {
        if (!date) return 'N/A';
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        if (isNaN(dateObj.getTime())) {
            return 'N/A';
        }
        
        return dateObj.toLocaleDateString('fr-FR');
    }
    
    /**
     * Calcule le nombre de jours entre maintenant et une date
     */
    static daysBetween(date: string | Date): number {
        if (!date) return 0;
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffTime = Math.abs(dateObj.getTime() - now.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    /**
     * Formate une heure en français
     */
    static formatTime(date: string | Date | undefined): string {
        if (!date) return 'N/A';
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        if (isNaN(dateObj.getTime())) {
            return 'N/A';
        }
        
        return dateObj.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    /**
     * Formate un timestamp ISO pour Telegram
     */
    static formatTimestamp(date: string | Date | undefined): string {
        if (!date) return new Date().toISOString();
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        
        if (isNaN(dateObj.getTime())) {
            return new Date().toISOString();
        }
        
        return dateObj.toISOString();
    }
    
    /**
     * Retourne une date relative (il y a X jours, dans X jours)
     */
    static getRelativeDate(date: string | Date): string {
        if (!date) return 'Date inconnue';
        
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const now = new Date();
        const diffTime = dateObj.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Aujourd\'hui';
        if (diffDays === 1) return 'Demain';
        if (diffDays === -1) return 'Hier';
        if (diffDays > 0) return `Dans ${diffDays} jour(s)`;
        return `Il y a ${Math.abs(diffDays)} jour(s)`;
    }
}