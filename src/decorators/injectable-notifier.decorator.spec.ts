import { 
  InjectableNotifier, 
  NotifierRegistry, 
  NotifierMetadata,
  getNotifierMetadata,
  discoverNotificationProviders,
  NOTIFIER_METADATA_KEY 
} from './injectable-notifier.decorator';
import { BaseNotificationProvider } from '../providers/base-notification-provider';
import { NotificationContext, NotificationResult } from '../types/interfaces';
import { RecipientDistribution } from '../loaders/recipient-loader.interface';

// Mock classes for testing
class ValidProvider extends BaseNotificationProvider<'email'> {
  async send(distribution: RecipientDistribution, payload: any, context: NotificationContext): Promise<NotificationResult[]> {
    return [];
  }
  
  async getAvailableTemplates(): Promise<string[]> {
    return [];
  }
  
  async hasTemplate(eventType: string): Promise<boolean> {
    return false;
  }
  
  clearTemplateCache(): void {}
  
  async healthCheck(): Promise<boolean> {
    return true;
  }
  
  validateConfig(config: any): boolean | string[] {
    return true;
  }
}

class DirectImplementationProvider {
  async send(): Promise<NotificationResult[]> {
    return [];
  }
  
  validateConfig(): boolean {
    return true;
  }
  
  async healthCheck(): Promise<boolean> {
    return true;
  }
}

class InvalidProvider {
  // Missing required methods
}

describe('InjectableNotifier Decorator', () => {
  beforeEach(() => {
    NotifierRegistry.clear();
  });

  afterEach(() => {
    NotifierRegistry.clear();
  });

  describe('NotifierRegistry', () => {
    it('should register providers without conflicts', () => {
      const metadata1: NotifierMetadata = { channel: 'email', description: 'Email provider' };
      const metadata2: NotifierMetadata = { channel: 'sms', description: 'SMS provider' };

      NotifierRegistry.register(ValidProvider, metadata1);
      NotifierRegistry.register(DirectImplementationProvider, metadata2);

      const providers = NotifierRegistry.getProviders();
      expect(providers).toHaveLength(2);
      expect(providers).toContain(ValidProvider);
      expect(providers).toContain(DirectImplementationProvider);
    });

    it('should throw error for duplicate channels', () => {
      const metadata1: NotifierMetadata = { channel: 'email', description: 'First email provider' };
      const metadata2: NotifierMetadata = { channel: 'email', description: 'Second email provider' };

      NotifierRegistry.register(ValidProvider, metadata1);

      expect(() => {
        NotifierRegistry.register(DirectImplementationProvider, metadata2);
      }).toThrow("Canal 'email' déjà utilisé par ValidProvider");
    });

    it('should get metadata for registered provider', () => {
      const metadata: NotifierMetadata = { channel: 'email', description: 'Email provider' };
      NotifierRegistry.register(ValidProvider, metadata);

      const retrievedMetadata = NotifierRegistry.getMetadata('ValidProvider');
      expect(retrievedMetadata).toEqual(metadata);
    });

    it('should return undefined for unregistered provider', () => {
      const metadata = NotifierRegistry.getMetadata('NonExistentProvider');
      expect(metadata).toBeUndefined();
    });

    it('should get all channels', () => {
      const metadata1: NotifierMetadata = { channel: 'email', description: 'Email provider' };
      const metadata2: NotifierMetadata = { channel: 'sms', description: 'SMS provider' };

      NotifierRegistry.register(ValidProvider, metadata1);
      NotifierRegistry.register(DirectImplementationProvider, metadata2);

      const channels = NotifierRegistry.getChannels();
      expect(channels).toEqual(['email', 'sms']);
    });

    it('should find provider by channel', () => {
      const metadata: NotifierMetadata = { channel: 'email', description: 'Email provider' };
      NotifierRegistry.register(ValidProvider, metadata);

      const provider = NotifierRegistry.getProviderByChannel('email');
      expect(provider).toBe(ValidProvider);
    });

    it('should return undefined for non-existent channel', () => {
      const provider = NotifierRegistry.getProviderByChannel('telegram' as any);
      expect(provider).toBeUndefined();
    });

    it('should clear registry', () => {
      const metadata: NotifierMetadata = { channel: 'email', description: 'Email provider' };
      NotifierRegistry.register(ValidProvider, metadata);

      expect(NotifierRegistry.getProviders()).toHaveLength(1);
      
      NotifierRegistry.clear();
      
      expect(NotifierRegistry.getProviders()).toHaveLength(0);
      expect(NotifierRegistry.getChannels()).toHaveLength(0);
    });
  });

  describe('InjectableNotifier decorator', () => {
    it('should successfully decorate valid provider extending BaseNotificationProvider', () => {
      const metadata: NotifierMetadata = { channel: 'email', description: 'Email provider' };
      
      @InjectableNotifier(metadata)
      class TestProvider extends BaseNotificationProvider<'email'> {
        async send(): Promise<NotificationResult[]> { return []; }
        async getAvailableTemplates(): Promise<string[]> { return []; }
        async hasTemplate(): Promise<boolean> { return false; }
        clearTemplateCache(): void {}
        async healthCheck(): Promise<boolean> { return true; }
        validateConfig(): boolean { return true; }
      }

      expect(NotifierRegistry.getProviders()).toContain(TestProvider);
      expect(NotifierRegistry.getMetadata('TestProvider')).toEqual(metadata);
    });

    it('should successfully decorate direct implementation', () => {
      const metadata: NotifierMetadata = { channel: 'webhook', description: 'Webhook provider' };
      
      @InjectableNotifier(metadata)
      class DirectProvider {
        async send(): Promise<NotificationResult[]> { return []; }
        validateConfig(): boolean { return true; }
        async healthCheck(): Promise<boolean> { return true; }
      }

      expect(NotifierRegistry.getProviders()).toContain(DirectProvider);
    });

    it('should throw error for class missing required methods', () => {
      const metadata: NotifierMetadata = { channel: 'invalid', description: 'Invalid provider' };
      
      expect(() => {
        @InjectableNotifier(metadata)
        class InvalidTestProvider {
          // Missing required methods
        }
      }).toThrow('@InjectableNotifier ne peut être appliqué qu\'à des classes qui implémentent NotificationProvider');
    });

    it('should throw error for class with incomplete implementation', () => {
      const metadata: NotifierMetadata = { channel: 'incomplete', description: 'Incomplete provider' };
      
      expect(() => {
        @InjectableNotifier(metadata)
        class IncompleteProvider {
          async send(): Promise<NotificationResult[]> { return []; }
          // Missing validateConfig and healthCheck
        }
      }).toThrow('@InjectableNotifier ne peut être appliqué qu\'à des classes qui implémentent NotificationProvider');
    });

    it('should store metadata using Reflect', () => {
      const metadata: NotifierMetadata = { channel: 'test', description: 'Test provider' };
      
      @InjectableNotifier(metadata)
      class MetadataTestProvider extends BaseNotificationProvider<'test'> {
        async send(): Promise<NotificationResult[]> { return []; }
        async getAvailableTemplates(): Promise<string[]> { return []; }
        async hasTemplate(): Promise<boolean> { return false; }
        clearTemplateCache(): void {}
        async healthCheck(): Promise<boolean> { return true; }
        validateConfig(): boolean { return true; }
      }

      const storedMetadata = Reflect.getMetadata(NOTIFIER_METADATA_KEY, MetadataTestProvider);
      expect(storedMetadata).toEqual(metadata);
    });
  });

  describe('utility functions', () => {
    it('should discover registered providers', () => {
      const metadata1: NotifierMetadata = { channel: 'email', description: 'Email provider' };
      const metadata2: NotifierMetadata = { channel: 'sms', description: 'SMS provider' };

      @InjectableNotifier(metadata1)
      class EmailProvider extends BaseNotificationProvider<'email'> {
        async send(): Promise<NotificationResult[]> { return []; }
        async getAvailableTemplates(): Promise<string[]> { return []; }
        async hasTemplate(): Promise<boolean> { return false; }
        clearTemplateCache(): void {}
        async healthCheck(): Promise<boolean> { return true; }
        validateConfig(): boolean { return true; }
      }

      @InjectableNotifier(metadata2)
      class SmsProvider extends BaseNotificationProvider<'sms'> {
        async send(): Promise<NotificationResult[]> { return []; }
        async getAvailableTemplates(): Promise<string[]> { return []; }
        async hasTemplate(): Promise<boolean> { return false; }
        clearTemplateCache(): void {}
        async healthCheck(): Promise<boolean> { return true; }
        validateConfig(): boolean { return true; }
      }

      const discovered = discoverNotificationProviders();
      expect(discovered).toHaveLength(2);
      expect(discovered).toContain(EmailProvider);
      expect(discovered).toContain(SmsProvider);
    });

    it('should get notifier metadata', () => {
      const metadata: NotifierMetadata = { channel: 'telegram', description: 'Telegram provider' };

      @InjectableNotifier(metadata)
      class TelegramProvider extends BaseNotificationProvider<'telegram'> {
        async send(): Promise<NotificationResult[]> { return []; }
        async getAvailableTemplates(): Promise<string[]> { return []; }
        async hasTemplate(): Promise<boolean> { return false; }
        clearTemplateCache(): void {}
        async healthCheck(): Promise<boolean> { return true; }
        validateConfig(): boolean { return true; }
      }

      const retrievedMetadata = getNotifierMetadata(TelegramProvider);
      expect(retrievedMetadata).toEqual(metadata);
    });

    it('should return undefined for class without metadata', () => {
      class PlainClass {}
      
      const metadata = getNotifierMetadata(PlainClass);
      expect(metadata).toBeUndefined();
    });
  });

  describe('validation functions', () => {
    it('should validate class extending BaseNotificationProvider', () => {
      // This test is implicit - if the decorator works, validation passed
      expect(() => {
        @InjectableNotifier({ channel: 'valid', description: 'Valid provider' })
        class ValidTestProvider extends BaseNotificationProvider<'valid'> {
          async send(): Promise<NotificationResult[]> { return []; }
          async getAvailableTemplates(): Promise<string[]> { return []; }
          async hasTemplate(): Promise<boolean> { return false; }
          clearTemplateCache(): void {}
          async healthCheck(): Promise<boolean> { return true; }
          validateConfig(): boolean { return true; }
        }
      }).not.toThrow();
    });

    it('should validate direct implementation with all required methods', () => {
      expect(() => {
        @InjectableNotifier({ channel: 'direct', description: 'Direct implementation' })
        class DirectValidProvider {
          async send(): Promise<NotificationResult[]> { return []; }
          validateConfig(): boolean { return true; }
          async healthCheck(): Promise<boolean> { return true; }
        }
      }).not.toThrow();
    });
  });

  describe('development logging', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should log in development environment', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      @InjectableNotifier({ channel: 'logging', description: 'Logging test' })
      class LoggingTestProvider extends BaseNotificationProvider<'logging'> {
        async send(): Promise<NotificationResult[]> { return []; }
        async getAvailableTemplates(): Promise<string[]> { return []; }
        async hasTemplate(): Promise<boolean> { return false; }
        clearTemplateCache(): void {}
        async healthCheck(): Promise<boolean> { return true; }
        validateConfig(): boolean { return true; }
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        "[InjectableNotifier] Provider 'LoggingTestProvider' enregistré pour le canal 'logging'"
      );

      consoleSpy.mockRestore();
    });

    it('should not log in production environment', () => {
      process.env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      @InjectableNotifier({ channel: 'silent', description: 'Silent test' })
      class SilentTestProvider extends BaseNotificationProvider<'silent'> {
        async send(): Promise<NotificationResult[]> { return []; }
        async getAvailableTemplates(): Promise<string[]> { return []; }
        async hasTemplate(): Promise<boolean> { return false; }
        clearTemplateCache(): void {}
        async healthCheck(): Promise<boolean> { return true; }
        validateConfig(): boolean { return true; }
      }

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });
});