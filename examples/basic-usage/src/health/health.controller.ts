import {Controller, Get} from '@nestjs/common';
import {EventEmitterService} from '@afidos/nestjs-event-notifications';

@Controller('health')
export class HealthController {
    constructor(
        private readonly eventEmitter: EventEmitterService
    ) {
    }

    @Get()
    async getHealth() {
        try {
            const availableEvents = this.eventEmitter.getAvailableEventTypes();

            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    events: {
                        healthy: true,
                        availableEventTypes: availableEvents
                    },
                    database: {
                        healthy: true,
                        type: 'sqlite'
                    }
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }


    @Get('events')
    async getEventDetails() {
        const availableEvents = this.eventEmitter.getAvailableEventTypes();
        const eventConfigs: Record<string, any> = {};

        availableEvents.forEach(eventType => {
            eventConfigs[eventType] = this.eventEmitter.getEventConfig(eventType);
        });

        return {
            availableEventTypes: availableEvents,
            configurations: eventConfigs
        };
    }
}
