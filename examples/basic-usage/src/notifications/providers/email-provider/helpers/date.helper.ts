/**
 * Helper pour le formatage des dates
 */
export class DateHelper {
    
    /**
     * Formate une date en français
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
     * Formate une date courte
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
}