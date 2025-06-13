import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventTypeEntity } from '../entities/event-type.entity';
import { EventTypesConfig } from '../config/event-config.interface';

@Injectable()
@Command({
  name: 'sync-event-types',
  description: 'Synchronize event types configuration with database',
})
export class SyncEventTypesCommand extends CommandRunner {
  constructor(
    @InjectRepository(EventTypeEntity)
    private eventTypeRepository: Repository<EventTypeEntity>,
  ) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    console.log('Synchronizing event types...');

    // Load configuration (this would be injected in real implementation)
    const config: EventTypesConfig = this.loadEventTypesConfig();

    for (const [name, eventConfig] of Object.entries(config)) {
      const existingEventType = await this.eventTypeRepository.findOne({
        where: { name }
      });

      if (existingEventType) {
        // Update existing
        await this.eventTypeRepository.update(existingEventType.id, {
          description: eventConfig.description,
          schema: eventConfig.schema,
          channels: eventConfig.channels,
          defaultProcessing: eventConfig.defaultProcessing,
          waitForResult: eventConfig.waitForResult,
          templates: eventConfig.templates,
          retryPolicy: eventConfig.retryPolicy,
          rateLimiting: eventConfig.rateLimiting,
          priority: eventConfig.priority,
          enabled: eventConfig.enabled ?? true,
        });
        console.log(`✓ Updated event type: ${name}`);
      } else {
        // Create new
        await this.eventTypeRepository.save({
          name,
          description: eventConfig.description,
          schema: eventConfig.schema,
          channels: eventConfig.channels,
          defaultProcessing: eventConfig.defaultProcessing,
          waitForResult: eventConfig.waitForResult,
          templates: eventConfig.templates,
          retryPolicy: eventConfig.retryPolicy,
          rateLimiting: eventConfig.rateLimiting,
          priority: eventConfig.priority,
          enabled: eventConfig.enabled ?? true,
        });
        console.log(`✓ Created event type: ${name}`);
      }
    }

    console.log('Event types synchronization completed!');
  }

  private loadEventTypesConfig(): EventTypesConfig {
    // In real implementation, this would load from configuration
    return {};
  }
}
