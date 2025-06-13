import { Module } from '@nestjs/common';
import {
    EventNotificationsModule,
    EventRoutingService
} from '@afidos/nestjs-event-notifications';
import { SlackProvider } from './custom-provider';


@Module({
    imports: [
        EventNotificationsModule.forRoot<MyAppEvents>({
            // ... configuration de base
            eventTypes: {
                'alert.system': {
                    description: 'System alerts',
                    channels: ['slack'],
                    defaultProcessing: 'sync',
                    waitForResult: true
                }
            },
            providers: {
                // Providers standard
                email: { /* config */ },

                // Provider custom Slack
                slack: {
                    driver: 'custom',
                    config: {
                        botToken: process.env.SLACK_BOT_TOKEN,
                        defaultChannel: '#alerts',
                        username: 'MyApp Bot',
                        iconEmoji: ':robot_face:'
                    }
                }
            }
        })
    ],
    providers: [
        // Enregistrement manual du provider custom
        {
            provide: 'SLACK_PROVIDER',
            useFactory: (routingService: EventRoutingService) => {
                const provider = new SlackProvider({
                    botToken: process.env.SLACK_BOT_TOKEN,
                    defaultChannel: '#alerts',
                    username: 'MyApp Bot',
                    iconEmoji: ':robot_face:'
                });

                routingService.registerProvider(provider);
                return provider;
            },
            inject: [EventRoutingService]
        }
    ]
})
export class AppWithCustomProviderModule {}
