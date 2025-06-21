// Types simplifiés pour les tests
export interface TestRecipient {
  id: string;
  name: string;
  email?: string;
  telegramId?: string;
  webhookUrl?: string;
}

export interface TestRecipientDistribution {
  to?: TestRecipient | TestRecipient[];
  cc?: TestRecipient | TestRecipient[];
  bcc?: TestRecipient | TestRecipient[];
}

export interface TestNotificationContext {
  eventId: string;
  correlationId: string;
  eventType: string;
  attempt?: number;
  metadata?: Record<string, any>;
}

export interface TestNotificationResult {
  status: 'sent' | 'failed' | 'skipped';
  eventId: string;
  eventType: string;
  correlationId: string;
  timestamp: Date;
  error?: string;
  metadata?: any;
}

export interface TestEventEmissionResult {
  eventId: string;
  correlationId: string;
  timestamp: Date;
  results: TestNotificationResult[];
}