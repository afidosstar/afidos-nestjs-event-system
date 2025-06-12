import { EventTypesConfig } from '@afidos/nestjs-event-notifications';

export const orderEvents: EventTypesConfig = {
    'order.placed': {
        description: 'Order placed with comprehensive details',
        schema: {
            orderId: { type: 'string', required: true },
            customerId: { type: 'number', required: true },
            customerEmail: { type: 'string', required: true },
            orderNumber: { type: 'string', required: true },
            totalAmount: { type: 'number', required: true },
            currency: { type: 'string', required: true },
            items: { type: 'array', required: true },
            shippingAddress: { type: 'object', required: true },
            billingAddress: { type: 'object', required: false },
            discounts: { type: 'array', required: false },
            tax: { type: 'number', required: false },
            shippingCost: { type: 'number', required: false },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['email', 'sms', 'webhook'],
        templates: {
            email: 'order-confirmation-detailed',
            sms: 'order-placed-sms',
        },
        priority: 'high',
    },

    'order.inventory.reserved': {
        description: 'Inventory reserved for order',
        schema: {
            orderId: { type: 'string', required: true },
            items: { type: 'array', required: true },
            reservationId: { type: 'string', required: true },
            expiresAt: { type: 'date', required: true },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['webhook'],
        priority: 'high',
        retryPolicy: {
            attempts: 3,
            delay: 1000,
            backoff: 'linear',
        },
    },

    'order.status.updated': {
        description: 'Order status changed',
        schema: {
            orderId: { type: 'string', required: true },
            customerId: { type: 'number', required: true },
            previousStatus: { type: 'string', required: true },
            newStatus: { type: 'string', required: true },
            updatedBy: { type: 'string', required: true },
            reason: { type: 'string', required: false },
            estimatedDelivery: { type: 'date', required: false },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['email', 'push', 'webhook'],
        templates: {
            email: 'order-status-update',
            push: 'order-status-push',
        },
        priority: 'normal',
    },

    'order.cancelled': {
        description: 'Order cancellation with refund information',
        schema: {
            orderId: { type: 'string', required: true },
            customerId: { type: 'number', required: true },
            cancelledBy: { type: 'string', required: true },
            reason: { type: 'string', required: true },
            refundAmount: { type: 'number', required: false },
            refundMethod: { type: 'string', required: false },
            processingTime: { type: 'string', required: false },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['email', 'sms'],
        templates: {
            email: 'order-cancellation-confirmation',
            sms: 'order-cancelled-sms',
        },
        priority: 'high',
    },
};
