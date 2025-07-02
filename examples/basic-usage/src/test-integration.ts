#!/usr/bin/env ts-node
/**
 * Test d'intégration du FileQueueProvider avec le système d'événements
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { EventEmitterService } from '@afidos/nestjs-event-notifications';
import { MyAppEvents } from './config';

async function testIntegration() {
    const logger = new Logger('IntegrationTest');
    
    try {
        logger.log('🚀 Création du contexte NestJS...');
        
        // Créer le contexte NestJS sans démarrer le serveur HTTP
        const app = await NestFactory.createApplicationContext(AppModule);
        
        logger.log('✅ Contexte NestJS créé');
        
        // Récupérer le service EventEmitter avec le bon typage
        const eventEmitter = app.get(EventEmitterService) as EventEmitterService<MyAppEvents>;
        
        logger.log('📤 Test d\'émission d\'événement...');
        
        // Emettre un événement de test
        const result = await eventEmitter.emitAsync('user.created', {
            id: 123,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User'
        });
        
        logger.log(`✅ Événement émis avec succès. Résultat: ${JSON.stringify(result, null, 2)}`);
        
        // Attendre un peu pour voir le traitement
        logger.log('⏳ Attente de 3 secondes pour voir le traitement...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Fermer l'application
        logger.log('🔒 Fermeture de l\'application...');
        await app.close();
        
        logger.log('🎉 Test d\'intégration terminé avec succès !');
        
    } catch (error) {
        logger.error('❌ Erreur pendant le test d\'intégration:', error.message);
        logger.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Lancer le test
testIntegration();