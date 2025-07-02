#!/usr/bin/env ts-node
/**
 * Test du mode worker avec les nouveaux providers BullMQ/NestJS
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';
import { 
    EventEmitterService, 
    QueueManagerService,
    QUEUE_PROVIDER_TOKEN,
    QueueProvider 
} from '@afidos/nestjs-event-notifications';
import { MyAppEvents } from './config';

async function bootstrap() {
    const logger = new Logger('WorkerTest');
    
    try {
        logger.log('🚀 Test du mode worker avec BullMQ/NestJS...');
        
        // Créer l'application worker
        const app = await NestFactory.createApplicationContext(WorkerModule);
        
        // Récupérer les services
        const eventEmitter: EventEmitterService<MyAppEvents> = app.get(EventEmitterService);
        const queueManager: QueueManagerService = app.get(QueueManagerService);
        const queueProvider: QueueProvider = app.get(QUEUE_PROVIDER_TOKEN);
        
        logger.log('✅ Application worker initialisée');
        
        // Test des statistiques de la queue
        logger.log('📊 Statistiques de la queue...');
        const queueStats = await queueManager.getQueueStats();
        logger.log('Queue stats:', JSON.stringify(queueStats, null, 2));
        
        // Test de health check
        logger.log('🏥 Health check...');
        const healthCheck = await queueManager.healthCheck();
        logger.log('Health check:', JSON.stringify(healthCheck, null, 2));
        
        // Test d'émission d'événement en mode queue
        logger.log('📤 Test d\'émission d\'événement en mode worker...');
        const result = await eventEmitter.emitAsync('user.created', {
            id: 123,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User'
        });
        
        logger.log('Résultat d\'émission:', JSON.stringify(result, null, 2));
        
        // Attendre un peu pour voir le traitement
        logger.log('⏳ Attente de 3 secondes pour voir le traitement des jobs...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Statistiques finales
        const finalStats = await queueProvider.getStats();
        logger.log('📊 Statistiques finales:', JSON.stringify(finalStats, null, 2));
        
        logger.log('🎉 Test du mode worker terminé avec succès !');
        
        // Fermer l'application
        await app.close();
        
    } catch (error) {
        logger.error('❌ Erreur pendant le test:', error.message);
        logger.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Lancer le test
bootstrap();