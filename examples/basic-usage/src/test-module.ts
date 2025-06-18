import { DynamicModule, Module } from '@nestjs/common';
import { EventTypesConfig } from '@afidos/nestjs-event-notifications';

const TEST_CONFIG = 'TEST_CONFIG';

@Module({})
export class TestModule {
    static forRoot(config: EventTypesConfig): DynamicModule {
        return {
            module: TestModule,
            providers: [
                {
                    provide: TEST_CONFIG,
                    useValue: config,
                }
            ],
            exports: [TEST_CONFIG],
            global: true
        };
    }
}