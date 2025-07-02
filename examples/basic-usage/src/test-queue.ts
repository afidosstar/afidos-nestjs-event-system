#!/usr/bin/env ts-node
/**
 * Script de test pour les nouveaux queue providers
 * Utilise directement les providers avec NestJS
 */

import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullMQIntegrationModule } from './queue/bullmq-integration.module';
import { QUEUE_PROVIDER_TOKEN, QueueProvider } from '@afidos/nestjs-event-notifications';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullMQIntegrationModule,
  ],
})
class TestModule {}

async function bootstrap() {
  const logger = new Logger('QueueTest');
  
  try {
    logger.log('🚀 Démarrage du test des queue providers...');
    
    // Créer l'application NestJS
    const app = await NestFactory.createApplicationContext(TestModule);
    
    // Récupérer le queue provider
    const queueProvider: QueueProvider = app.get(QUEUE_PROVIDER_TOKEN);
    
    logger.log('✅ Queue provider initialisé avec succès');
    
    // Test d'ajout d'un job
    logger.log('📤 Test d\'ajout d\'un job...');
    const job = await queueProvider.add('test-job', {
      message: 'Hello from BullMQ!',
      timestamp: new Date().toISOString(),
    });
    
    logger.log(`✅ Job ajouté avec l'ID: ${job.id}`);
    
    // Test des statistiques
    logger.log('📊 Récupération des statistiques...');
    const stats = await queueProvider.getStats();
    logger.log('Statistiques:', JSON.stringify(stats, null, 2));
    
    // Test du health check
    logger.log('🏥 Test du health check...');
    const isHealthy = await queueProvider.isHealthy();
    logger.log(`✅ Queue health status: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    
    logger.log('🎉 Tous les tests ont réussi !');
    
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