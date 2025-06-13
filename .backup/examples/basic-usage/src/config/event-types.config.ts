import { EventTypesConfig } from '@afidos/nestjs-event-notifications';

export const eventTypesConfig: EventTypesConfig = {
    // User Events
    'user.created': {
        description: 'User account created successfully',
        schema: {
            userId: { type: 'number', required: true },
            email: { type: 'string', required: true },
            firstName: { type: 'string', required: true },
            lastName: { type: 'string', required: true },
            registrationSource: { type: 'string', required: false },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['email'],
        templates: {
            email: 'user-welcome',
        },
        priority: 'normal',
    },

    'user.password.reset': {
        description: 'Password reset requested',
        schema: {
            userId: { type: 'number', required: true },
            email: { type: 'string', required: true },
            resetToken: { type: 'string', required: true },
            expiresAt: { type: 'date', required: true },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['email'],
        templates: {
            email: 'password-reset',
        },
        priority: 'high',
        retryPolicy: {
            attempts: 5,
            delay: 1000,
            backoff: 'exponential',
        },
    },

    // Order Events
    'order.created': {
        description: 'New order placed',
        schema: {
            orderId: { type: 'string', required: true },
            customerId: { type: 'number', required: true },
            customerEmail: { type: 'string', required: true },
            totalAmount: { type: 'number', required: true },
            currency: { type: 'string', required: true },
            items: { type: 'array', required: true },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['email', 'webhook'],
        templates: {
            email: 'order-confirmation',
        },
        priority: 'high',
    },

    'order.shipped': {
        description: 'Order has been shipped',
        schema: {
            orderId: { type: 'string', required: true },
            customerId: { type: 'number', required: true },
            trackingNumber: { type: 'string', required: true },
            carrier: { type: 'string', required: true },
            estimatedDelivery: { type: 'date', required: false },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['email', 'sms'],
        templates: {
            email: 'shipping-notification',
            sms: 'shipping-sms',
        },
        priority: 'normal',
    },

    // Payment Events
    'payment.completed': {
        description: 'Payment processed successfully',
        schema: {
            paymentId: { type: 'string', required: true },
            orderId: { type: 'string', required: true },
            customerId: { type: 'number', required: true },
            amount: { type: 'number', required: true },
            method: { type: 'string', required: true },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['email', 'webhook'],
        templates: {
            email: 'payment-confirmation',
        },
        priority: 'high',
    },

    'payment.failed': {
        description: 'Payment processing failed',
        schema: {
            paymentId: { type: 'string', required: true },
            orderId: { type: 'string', required: true },
            customerId: { type: 'number', required: true },
            amount: { type: 'number', required: true },
            failureReason: { type: 'string', required: true },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['email'],
        templates: {
            email: 'payment-failed',
        },
        priority: 'high',
        retryPolicy: {
            attempts: 3,
            delay: 5000,
            backoff: 'linear',
        },
    },
};
