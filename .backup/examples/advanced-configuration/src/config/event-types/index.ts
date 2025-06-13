import { EventTypesConfig } from '@afidos/nestjs-event-notifications';
import { userEvents } from './user.events';
import { orderEvents } from './order.events';
import { paymentEvents } from './payment.events';
import { systemEvents } from './system.events';
import { marketingEvents } from './marketing.events';

export const eventTypesConfig: EventTypesConfig = {
    ...userEvents,
    ...orderEvents,
    ...paymentEvents,
    ...systemEvents,
    ...marketingEvents,
};
