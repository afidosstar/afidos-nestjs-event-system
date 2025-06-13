export class PayloadTransformer {
    static transform(payload: any, transformRules?: Record<string, (value: any) => any>): any {
      if (!transformRules) {
        return payload;
      }
  
      const transformed = { ...payload };
  
      for (const [field, transformer] of Object.entries(transformRules)) {
        if (field in transformed) {
          try {
            transformed[field] = transformer(transformed[field]);
          } catch (error) {
            console.warn(`Failed to transform field "${field}":`, error);
          }
        }
      }
  
      return transformed;
    }
  
    static sanitize(payload: any): any {
      const sanitized = { ...payload };
  
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
      
      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }
  
      return sanitized;
    }
  
    static flatten(obj: any, prefix = ''): Record<string, any> {
      const flattened: Record<string, any> = {};
  
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
  
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(flattened, this.flatten(value, newKey));
        } else {
          flattened[newKey] = value;
        }
      }
  
      return flattened;
    }
  }
  