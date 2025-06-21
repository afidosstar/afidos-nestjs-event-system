import { SimpleEngine } from './template-engine/engines/simple.engine';
import { FunctionTemplateLoader } from './template-engine/loaders/function-template.loader';
import { InjectableNotifier, NotifierRegistry } from './decorators/injectable-notifier.decorator';

describe('Core Library Tests', () => {
  describe('SimpleEngine Basic Tests', () => {
    let engine: SimpleEngine;

    beforeEach(() => {
      engine = new SimpleEngine({ engine: 'simple' });
    });

    it('should render simple variables', async () => {
      const result = await engine.render('Hello {{name}}', { name: 'World' });
      expect(result).toBe('Hello World');
    });

    it('should render nested properties', async () => {
      const result = await engine.render('{{user.name}}', { user: { name: 'John' } });
      expect(result).toBe('John');
    });

    it('should handle undefined variables', async () => {
      const result = await engine.render('{{undefined}}', {});
      expect(result).toBe('');
    });

    it('should process basic conditions', async () => {
      const result = await engine.render('{{#if active}}Yes{{/if}}', { active: true });
      expect(result).toBe('Yes');
    });

    it('should handle false conditions', async () => {
      const result = await engine.render('{{#if active}}Yes{{/if}}', { active: false });
      expect(result).toBe('');
    });

    it('should validate correct syntax', () => {
      const result = engine.validate('{{name}}');
      expect(result.isValid).toBe(true);
    });

    it('should detect invalid syntax', () => {
      const result = engine.validate('{{#if test}}unclosed');
      expect(result.isValid).toBe(false);
    });

    it('should register and use helpers', () => {
      engine.registerHelper('upper', (text: string) => text.toUpperCase());
      expect(engine.getAvailableHelpers()).toContain('upper');
    });
  });

  describe('FunctionTemplateLoader Basic Tests', () => {
    let loader: FunctionTemplateLoader;

    beforeEach(() => {
      loader = new FunctionTemplateLoader();
    });

    it('should register and render template', async () => {
      loader.registerTemplate('test', (data: any) => `Hello ${data.name}`);
      const result = await loader.render('test', { name: 'World' });
      expect(result).toBe('Hello World');
    });

    it('should check template existence', async () => {
      loader.registerTemplate('exists', () => 'test');
      const exists = await loader.exists('exists');
      const notExists = await loader.exists('notexists');
      
      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should list templates', async () => {
      loader.registerTemplate('template1', () => 'test1');
      loader.registerTemplate('template2', () => 'test2');
      
      const list = await loader.list();
      expect(list).toEqual(['template1', 'template2']);
    });

    it('should get template count', () => {
      loader.registerTemplate('test1', () => 'test');
      loader.registerTemplate('test2', () => 'test');
      
      expect(loader.getTemplateCount()).toBe(2);
    });

    it('should clear templates', () => {
      loader.registerTemplate('test', () => 'test');
      expect(loader.getTemplateCount()).toBe(1);
      
      loader.clear();
      expect(loader.getTemplateCount()).toBe(0);
    });

    it('should validate templates', () => {
      loader.registerTemplate('valid', () => 'test');
      
      const validResult = loader.validateTemplate('valid');
      const invalidResult = loader.validateTemplate('nonexistent');
      
      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should have default templates', () => {
      const defaults = FunctionTemplateLoader.getDefaultTemplates();
      expect(typeof defaults).toBe('object');
      expect(Object.keys(defaults).length).toBeGreaterThan(0);
    });
  });

  describe('Injectable Decorator Tests', () => {
    beforeEach(() => {
      NotifierRegistry.clear();
    });

    afterEach(() => {
      NotifierRegistry.clear();
    });

    it('should register provider', () => {
      @InjectableNotifier({ channel: 'test', description: 'Test provider' })
      class TestProvider {
        async send(): Promise<any[]> { return []; }
        validateConfig(): boolean { return true; }
        async healthCheck(): Promise<boolean> { return true; }
      }

      const providers = NotifierRegistry.getProviders();
      expect(providers).toContain(TestProvider);
    });

    it('should store metadata', () => {
      @InjectableNotifier({ channel: 'email', description: 'Email provider' })
      class EmailProvider {
        async send(): Promise<any[]> { return []; }
        validateConfig(): boolean { return true; }
        async healthCheck(): Promise<boolean> { return true; }
      }

      const metadata = NotifierRegistry.getMetadata('EmailProvider');
      expect(metadata).toEqual({ channel: 'email', description: 'Email provider' });
    });

    it('should prevent duplicate channels', () => {
      @InjectableNotifier({ channel: 'duplicate' })
      class FirstProvider {
        async send(): Promise<any[]> { return []; }
        validateConfig(): boolean { return true; }
        async healthCheck(): Promise<boolean> { return true; }
      }

      expect(() => {
        @InjectableNotifier({ channel: 'duplicate' })
        class SecondProvider {
          async send(): Promise<any[]> { return []; }
          validateConfig(): boolean { return true; }
          async healthCheck(): Promise<boolean> { return true; }
        }
      }).toThrow();
    });

    it('should find provider by channel', () => {
      @InjectableNotifier({ channel: 'findme' })
      class FindMeProvider {
        async send(): Promise<any[]> { return []; }
        validateConfig(): boolean { return true; }
        async healthCheck(): Promise<boolean> { return true; }
      }

      const provider = NotifierRegistry.getProviderByChannel('findme');
      expect(provider).toBe(FindMeProvider);
    });

    it('should list all channels', () => {
      @InjectableNotifier({ channel: 'channel1' })
      class Provider1 {
        async send(): Promise<any[]> { return []; }
        validateConfig(): boolean { return true; }
        async healthCheck(): Promise<boolean> { return true; }
      }

      @InjectableNotifier({ channel: 'channel2' })
      class Provider2 {
        async send(): Promise<any[]> { return []; }
        validateConfig(): boolean { return true; }
        async healthCheck(): Promise<boolean> { return true; }
      }

      const channels = NotifierRegistry.getChannels();
      expect(channels).toEqual(['channel1', 'channel2']);
    });
  });

  describe('Error Handling', () => {
    it('should handle template rendering errors', async () => {
      const engine = new SimpleEngine({ engine: 'simple' });
      
      // Test avec un template qui va causer une erreur
      jest.spyOn(engine as any, 'processVariables').mockImplementation(() => {
        throw new Error('Mock error');
      });

      await expect(engine.render('{{test}}', {}))
        .rejects.toThrow('Template render failed');
    });

    it('should handle missing template functions', async () => {
      const loader = new FunctionTemplateLoader();
      
      await expect(loader.render('nonexistent', {}))
        .rejects.toThrow("Template function 'nonexistent' not found");
    });

    it('should handle template function errors', async () => {
      const loader = new FunctionTemplateLoader();
      loader.registerTemplate('error', () => {
        throw new Error('Template error');
      });

      await expect(loader.render('error', {}))
        .rejects.toThrow("Template function 'error' execution failed");
    });
  });
});