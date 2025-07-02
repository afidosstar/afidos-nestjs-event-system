#!/usr/bin/env ts-node
/**
 * Exemple d'utilisation de la nouvelle API avec un custom QueueProvider
 */

import { NestFactory } from '@nestjs/core';
import { Logger, Module } from '@nestjs/common';
import { EventNotificationsModule, EventEmitterService, FileQueueProvider } from '@afidos/nestjs-event-notifications';
import { MyAppEvents, packageConfig } from './config';
import { StaticRecipientLoader } from './loaders/static-recipient.loader';

// Module d'exemple utilisant la factory par défaut pour FileQueueProvider
@Module({
  imports: [
    EventNotificationsModule.forRoot<MyAppEvents>({
      config: {
        ...packageConfig,
        mode: 'hybrid' // Override du mode pour tester
      },
      recipientLoader: StaticRecipientLoader
      // queueProvider omis = utilise la factory par défaut qui crée un FileQueueProvider
    })
  ]
})
class ExampleModule {}

async function testCustomQueueProvider() {
    const logger = new Logger('CustomQueueTest');
    
    try {
        logger.log('🚀 Test avec custom FileQueueProvider...');
        
        // Créer le contexte avec le module custom
        const app = await NestFactory.createApplicationContext(ExampleModule);
        
        logger.log('✅ Module avec custom QueueProvider créé');
        
        // Récupérer le service EventEmitter
        const eventEmitter = app.get(EventEmitterService) as EventEmitterService<MyAppEvents>;
        
        logger.log('📤 Test d\'émission avec custom queue...');
        
        // Emettre un événement
        const result = await eventEmitter.emitAsync('order.created', {
            id: 'order-123',
            userId: 456,
            customerEmail: 'customer@example.com',
            customerName: 'John Doe',
            total: 99.99,
            items: [
                { productId: 'prod-1', quantity: 2, price: 49.99 }
            ]
        });
        
        logger.log(`✅ Événement order.created émis. Résultat:`);
        logger.log(JSON.stringify(result, null, 2));
        
        // Attendre le traitement
        logger.log('⏳ Attente de 3 secondes...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Fermer l'application
        logger.log('🔒 Fermeture...');
        await app.close();
        
        logger.log('🎉 Test custom QueueProvider réussi !');
        
    } catch (error) {
        logger.error('❌ Erreur:', error.message);
        logger.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Lancer le test
testCustomQueueProvider();