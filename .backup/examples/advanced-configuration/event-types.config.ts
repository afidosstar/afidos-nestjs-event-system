import { EventTypesConfig } from '@afidos/nestjs-event-notifications';

export const eventTypesConfig: EventTypesConfig = {
  // User events
  'user.registered': {
    description: 'New user registration',
    schema: {
      userId: { type: 'number', required: true },
      email: { type: 'string', required: true },
      fullName: { type: 'string', required: true },
      registrationSource: { type: 'string', required: false },
    },
    defaultProcessing: 'async',
    waitForResult: false,
    channels: ['email'],
    templates: {
      email: 'user-welcome',
    },
    priority: 'normal',
    rateLimiting: {
      windowMs: 60000,
      maxRequests: 1, // Only one welcome email per minute per user
    },
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
      maxDelay: 30000,
    },
  },

  // E-commerce events
  'order.created': {
    description: 'New order placed',
    schema: {
      orderId: { type: 'string', required: true },
      customerId: { type: 'number', required: true },
      customerEmail: { type: 'string', required: true },
      totalAmount: { type: 'number', required: true },
      currency: { type: 'string', required: true },
      items: { type: 'array', required: true },
      shippingAddress: { type: 'object', required: true },
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

  'payment.failed': {
    description: 'Payment processing failed',
    schema: {
      paymentId: { type: 'string', required: true },
      orderId: { type: 'string', required: true },
      customerId: { type: 'number', required: true },
      amount: { type: 'number', required: true },
      failureReason: { type: 'string', required: true },
      retryAttempt: { type: 'number', required: false },
    },
    defaultProcessing: 'sync',
    waitForResult: true,
    channels: ['email', 'webhook'],
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

  // Admin events
  'admin.security.alert': {
    description: 'Security alert for administrators',
    schema: {
      alertType: { type: 'string', required: true },
      severity: { type: 'string', required: true },
      description: { type: 'string', required: true },
      affectedUser: { type: 'number', required: false },
      ipAddress: { type: 'string', required: false },
      timestamp: { type: 'date', required: true },
    },
    defaultProcessing: 'sync',
    waitForResult: true,
    channels: ['email', 'sms', 'webhook'],
    priority: 'high',
    retryPolicy: {
      attempts: 5,
      delay: 1000,
      backoff: 'exponential',
    },
  },

  // Marketing events
  'marketing.newsletter': {
    description: 'Newsletter subscription',
    schema: {
      email: { type: 'string', required: true },
      firstName: { type: 'string', required: false },
      preferences: { type: 'object', required: false },
      source: { type: 'string', required: false },
    },
    defaultProcessing: 'async',
    waitForResult: false,
    channels: ['email'],
    templates: {
      email: 'newsletter-welcome',
    },
    priority: 'low',
    rateLimiting: {
      windowMs: 86400000, // 24 hours
      maxRequests: 1, // One newsletter welcome per day
    },
  },
};
