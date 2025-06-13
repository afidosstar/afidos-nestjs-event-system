import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { Inject } from '@nestjs/common';
import { EventNotificationsConfig } from '../config/notification-config.interface';
import { SmtpEmailProvider } from '../providers/email/smtp-email.provider';
import { TwilioSmsProvider } from '../providers/sms/twilio-sms.provider';

@Injectable()
@Command({
  name: 'test-notification-config',
  description: 'Test notification provider configurations',
})
export class TestNotificationConfigCommand extends CommandRunner {
  constructor(
    @Inject('EVENT_NOTIFICATIONS_CONFIG')
    private config: EventNotificationsConfig,
  ) {
    super();
  }

  async run(passedParams: string[], options: Record<string, any>): Promise<void> {
    const provider = options.provider;

    if (provider) {
      await this.testSpecificProvider(provider);
    } else {
      await this.testAllProviders();
    }
  }

  private async testAllProviders(): Promise<void> {
    console.log('Testing all notification providers...\n');

    for (const [providerName, providerConfig] of Object.entries(this.config.providers)) {
      await this.testProvider(providerName, providerConfig);
    }
  }

  private async testSpecificProvider(providerName: string): Promise<void> {
    const providerConfig = this.config.providers[providerName];

    if (!providerConfig) {
      console.error(`❌ Provider '${providerName}' not found in configuration`);
      return;
    }

    await this.testProvider(providerName, providerConfig);
  }

  private async testProvider(providerName: string, providerConfig: any): Promise<void> {
    console.log(`Testing ${providerName} provider...`);

    try {
      let provider: any;

      switch (providerConfig.driver) {
        case 'smtp':
          provider = new SmtpEmailProvider(providerConfig.config);
          break;
        case 'twilio':
          provider = new TwilioSmsProvider(providerConfig.config);
          break;
        default:
          console.log(`  ⚠️  Unknown driver: ${providerConfig.driver}`);
          return;
      }

      // Validate configuration
      const configValid = provider.validateConfig(providerConfig.config);
      console.log(`  Config validation: ${configValid ? '✅' : '❌'}`);

      // Health check
      const healthOk = await provider.healthCheck();
      console.log(`  Health check: ${healthOk ? '✅' : '❌'}`);

      if (!configValid || !healthOk) {
        console.log(`  ❌ ${providerName} provider failed tests\n`);
      } else {
        console.log(`  ✅ ${providerName} provider passed all tests\n`);
      }

    } catch (error: any) {
      console.log(`  ❌ Error testing ${providerName}: ${error.message}\n`);
    }
  }

  @Option({
    flags: '-p, --provider <name>',
    description: 'Test specific provider only',
  })
  parseProvider(val: string): string {
    return val;
  }
}

