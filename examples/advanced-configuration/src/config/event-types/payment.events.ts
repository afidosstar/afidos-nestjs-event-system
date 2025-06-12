import { EventTypesConfig } from '@afidos/nestjs-event-notifications';

export const paymentEvents: EventTypesConfig = {
    'payment.processing': {
        description: 'Payment processing started',
        schema: {
            paymentId: { type: 'string', required: true },
            orderId: { type: 'string', required: true },
            customerId: { type: 'number', required: true },
            amount: { type: 'number', required: true },
            currency: { type: 'string', required: true },
            paymentMethod: { type: 'string', required: true },
            processorId: { type: 'string', required: true },
        },
        defaultProcessing: 'async',
        waitForResult: false,
        channels: ['webhook'],
        priority: 'high',
    },

    'payment.completed': {
        description: 'Payment successfully processed',
        schema: {
            paymentId: { type: 'string', required: true },
            orderId: { type: 'string', required: true },
            customerId: { type: 'number', required: true },
            amount: { type: 'number', required: true },
            currency: { type: 'string', required: true },
            paymentMethod: { type: 'string', required: true },
            transactionId: { type: 'string', required: true },
            processingFee: { type: 'number', required: false },
            completedAt: { type: 'date', required: true },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['email', 'sms', 'webhook'],
        templates: {
            email: 'payment-confirmation',
            sms: 'payment-success-sms',
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
            failureCode: { type: 'string', required: true },
            failureReason: { type: 'string', required: true },
            retryable: { type: 'boolean', required: true },
            nextRetryAt: { type: 'date', required: false },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['email', 'webhook'],
        templates: {
            email: 'payment-failed-retry',
        },
        priority: 'high',
        retryPolicy: {
            attempts: 3,
            delay: 5000,
            backoff: 'linear',
        },
    },

    'payment.refund.processed': {
        description: 'Refund processed successfully',
        schema: {
            refundId: { type: 'string', required: true },
            originalPaymentId: { type: 'string', required: true },
            orderId: { type: 'string', required: true },
            customerId: { type: 'number', required: true },
            refundAmount: { type: 'number', required: true },
            currency: { type: 'string', required: true },
            reason: { type: 'string', required: true },
            processedAt: { type: 'date', required: true },
        },
        defaultProcessing: 'sync',
        waitForResult: true,
        channels: ['email', 'sms'],
        templates: {
            email: 'refund-processed-confirmation',
            sms: 'refund-processed-sms',
        },
        priority: 'high',
    },
};
