/**
 * Import et export de tous les helpers Telegram
 */
import { TelegramDateHelper } from './date.helper';
import { TelegramFormatHelper } from './format.helper';
import { TelegramUrlHelper } from './url.helper';

export { TelegramDateHelper, TelegramFormatHelper, TelegramUrlHelper };

/**
 * Interface pour les helpers disponibles dans les templates Telegram
 */
export interface TelegramTemplateHelpers {
    // Date helpers
    formatDate: (date: string | Date | undefined) => string;
    formatDateShort: (date: string | Date | undefined) => string;
    formatTime: (date: string | Date | undefined) => string;
    formatTimestamp: (date: string | Date | undefined) => string;
    daysBetween: (date: string | Date) => number;
    getRelativeDate: (date: string | Date) => string;
    
    // Format helpers
    formatPrice: (price: number | string | undefined) => string;
    formatJson: (obj: any) => string;
    capitalize: (str: string | undefined) => string;
    truncate: (text: string | undefined, length?: number) => string;
    formatPhone: (phone: string | undefined) => string;
    escapeHtml: (text: string | undefined) => string;
    formatUsername: (username: string | undefined) => string;
    formatTrackingCode: (code: string | undefined) => string;
    
    // URL helpers
    appUrl: (path?: string) => string;
    trackingUrl: (trackingNumber: string) => string;
    loginUrl: () => string;
    profileUrl: (userId?: string | number) => string;
    orderUrl: (orderId: string | number) => string;
    unsubscribeUrl: (userId: string | number, token?: string) => string;
    supportUrl: () => string;
    formatTelegramLink: (url: string, text?: string) => string;
    formatPhoneLink: (phone: string | undefined) => string;
    formatEmailLink: (email: string | undefined) => string;
    formatTelegramChatLink: (username: string) => string;
    shareUrl: (text: string, url?: string) => string;
}

/**
 * Crée une instance des helpers pour les templates Telegram
 */
export function createTelegramTemplateHelpers(): TelegramTemplateHelpers {
    return {
        // Date helpers
        formatDate: (date) => TelegramDateHelper.formatDate(date),
        formatDateShort: (date) => TelegramDateHelper.formatDateShort(date),
        formatTime: (date) => TelegramDateHelper.formatTime(date),
        formatTimestamp: (date) => TelegramDateHelper.formatTimestamp(date),
        daysBetween: (date) => TelegramDateHelper.daysBetween(date),
        getRelativeDate: (date) => TelegramDateHelper.getRelativeDate(date),
        
        // Format helpers
        formatPrice: (price) => TelegramFormatHelper.formatPrice(price),
        formatJson: (obj) => TelegramFormatHelper.formatJson(obj),
        capitalize: (str) => TelegramFormatHelper.capitalize(str),
        truncate: (text, length) => TelegramFormatHelper.truncate(text, length),
        formatPhone: (phone) => TelegramFormatHelper.formatPhone(phone),
        escapeHtml: (text) => TelegramFormatHelper.escapeHtml(text),
        formatUsername: (username) => TelegramFormatHelper.formatUsername(username),
        formatTrackingCode: (code) => TelegramFormatHelper.formatTrackingCode(code),
        
        // URL helpers
        appUrl: (path) => TelegramUrlHelper.appUrl(path),
        trackingUrl: (trackingNumber) => TelegramUrlHelper.trackingUrl(trackingNumber),
        loginUrl: () => TelegramUrlHelper.loginUrl(),
        profileUrl: (userId) => TelegramUrlHelper.profileUrl(userId),
        orderUrl: (orderId) => TelegramUrlHelper.orderUrl(orderId),
        unsubscribeUrl: (userId, token) => TelegramUrlHelper.unsubscribeUrl(userId, token),
        supportUrl: () => TelegramUrlHelper.supportUrl(),
        formatTelegramLink: (url, text) => TelegramUrlHelper.formatTelegramLink(url, text),
        formatPhoneLink: (phone) => TelegramUrlHelper.formatPhoneLink(phone),
        formatEmailLink: (email) => TelegramUrlHelper.formatEmailLink(email),
        formatTelegramChatLink: (username) => TelegramUrlHelper.formatTelegramChatLink(username),
        shareUrl: (text, url) => TelegramUrlHelper.shareUrl(text, url),
    };
}