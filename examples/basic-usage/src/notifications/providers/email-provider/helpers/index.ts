/**
 * Import et export de tous les helpers
 */
import { DateHelper } from './date.helper';
import { FormatHelper } from './format.helper';
import { UrlHelper } from './url.helper';

export { DateHelper, FormatHelper, UrlHelper };

/**
 * Interface pour les helpers disponibles dans les templates
 */
export interface TemplateHelpers {
    // Date helpers
    formatDate: (date: string | Date | undefined) => string;
    formatDateShort: (date: string | Date | undefined) => string;
    daysBetween: (date: string | Date) => number;
    
    // Format helpers
    formatPrice: (price: number | string | undefined) => string;
    formatJson: (obj: any) => string;
    capitalize: (str: string | undefined) => string;
    truncate: (text: string | undefined, length?: number) => string;
    formatPhone: (phone: string | undefined) => string;
    
    // URL helpers
    appUrl: (path?: string) => string;
    trackingUrl: (trackingNumber: string) => string;
    loginUrl: () => string;
    profileUrl: (userId?: string | number) => string;
    orderUrl: (orderId: string | number) => string;
    unsubscribeUrl: (userId: string | number, token?: string) => string;
    supportUrl: () => string;
}

/**
 * Crée une instance des helpers pour les templates
 */
export function createTemplateHelpers(): TemplateHelpers {
    return {
        // Date helpers
        formatDate: (date) => DateHelper.formatDate(date),
        formatDateShort: (date) => DateHelper.formatDateShort(date),
        daysBetween: (date) => DateHelper.daysBetween(date),
        
        // Format helpers
        formatPrice: (price) => FormatHelper.formatPrice(price),
        formatJson: (obj) => FormatHelper.formatJson(obj),
        capitalize: (str) => FormatHelper.capitalize(str),
        truncate: (text, length) => FormatHelper.truncate(text, length),
        formatPhone: (phone) => FormatHelper.formatPhone(phone),
        
        // URL helpers
        appUrl: (path) => UrlHelper.appUrl(path),
        trackingUrl: (trackingNumber) => UrlHelper.trackingUrl(trackingNumber),
        loginUrl: () => UrlHelper.loginUrl(),
        profileUrl: (userId) => UrlHelper.profileUrl(userId),
        orderUrl: (orderId) => UrlHelper.orderUrl(orderId),
        unsubscribeUrl: (userId, token) => UrlHelper.unsubscribeUrl(userId, token),
        supportUrl: () => UrlHelper.supportUrl(),
    };
}