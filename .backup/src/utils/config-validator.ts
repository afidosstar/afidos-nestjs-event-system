import { EventNotificationsConfig } from '../config/notification-config.interface';
import { Logger } from '@nestjs/common';

export class ConfigValidator {
  private static logger = new Logger(ConfigValidator.name);

  static validate(config: EventNotificationsConfig): boolean {
    const errors: string[] = [];

    // Validate event types
    if (!config.eventTypes || Object.keys(config.eventTypes).length === 0) {
      errors.push('At least one event type must be configured');
    }

    // Validate providers
    if (!config.providers || Object.keys(config.providers).length === 0) {
      errors.push('At least one notification provider must be configured');
    }

    // Validate mode
    if (!['api', 'worker', 'hybrid'].includes(config.mode)) {
      errors.push('Mode must be one of: api, worker, hybrid');
    }

    // Validate queue config
    if (!config.queue?.redis?.host) {
      errors.push('Redis host is required for queue configuration');
    }

    // Validate event types structure
    for (const [eventName, eventConfig] of Object.entries(config.eventTypes || {})) {
      if (!eventConfig.description) {
        errors.push(`Event type "${eventName}" is missing description`);
      }

      if (!eventConfig.schema || Object.keys(eventConfig.schema).length === 0) {
        errors.push(`Event type "${eventName}" is missing schema`);
      }

      if (!eventConfig.channels || eventConfig.channels.length === 0) {
        errors.push(`Event type "${eventName}" is missing channels`);
      }

      // Validate schema fields
      for (const [fieldName, fieldSchema] of Object.entries(eventConfig.schema || {})) {
        if (!fieldSchema.type) {
          errors.push(`Field "${fieldName}" in event type "${eventName}" is missing type`);
        }

        if (typeof fieldSchema.required !== 'boolean') {
          errors.push(`Field "${fieldName}" in event type "${eventName}" must specify required as boolean`);
        }
      }
    }

    // Validate providers structure
    for (const [providerName, providerConfig] of Object.entries(config.providers || {})) {
      if (!providerConfig.driver) {
        errors.push(`Provider "${providerName}" is missing driver`);
      }

      if (!providerConfig.config) {
        errors.push(`Provider "${providerName}" is missing config`);
      }
    }

    if (errors.length > 0) {
      this.logger.error('Configuration validation failed:');
      errors.forEach(error => this.logger.error(`- ${error}`));
      return false;
    }

    this.logger.log('Configuration validation passed');
    return true;
  }

  static validateEventPayload(payload: any, schema: Record<string, any>): boolean {
    const errors: string[] = [];

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const value = payload[fieldName];
      
      // Check required fields
      if (fieldSchema.required && (value === undefined || value === null)) {
        errors.push(`Required field "${fieldName}" is missing`);
        continue;
      }

      // Skip validation if field is optional and not provided
      if (!fieldSchema.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      const expectedType = fieldSchema.type;
      const actualType = typeof value;

      switch (expectedType) {
        case 'string':
          if (actualType !== 'string') {
            errors.push(`Field "${fieldName}" must be a string, got ${actualType}`);
          }
          break;

        case 'number':
          if (actualType !== 'number' || isNaN(value)) {
            errors.push(`Field "${fieldName}" must be a number, got ${actualType}`);
          }
          break;

        case 'boolean':
          if (actualType !== 'boolean') {
            errors.push(`Field "${fieldName}" must be a boolean, got ${actualType}`);
          }
          break;

        case 'date':
          if (!(value instanceof Date) && !Date.parse(value)) {
            errors.push(`Field "${fieldName}" must be a valid date`);
          }
          break;

        case 'object':
          if (actualType !== 'object' || Array.isArray(value)) {
            errors.push(`Field "${fieldName}" must be an object, got ${actualType}`);
          }
          break;

        case 'array':
          if (!Array.isArray(value)) {
            errors.push(`Field "${fieldName}" must be an array`);
          }
          break;
      }
    }

    if (errors.length > 0) {
      this.logger.error('Payload validation failed:');
      errors.forEach(error => this.logger.error(`- ${error}`));
      return false;
    }

    return true;
  }
}