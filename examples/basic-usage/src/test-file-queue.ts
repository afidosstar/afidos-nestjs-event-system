#!/usr/bin/env ts-node
/**
 * Test du FileQueueProvider - Simple broker basé sur fichier
 */

import { Logger } from '@nestjs/common';
import { FileQueueProvider } from '@afidos/nestjs-event-notifications';

async function testFileQueue() {
    const logger = new Logger('FileQueueTest');
    
    try {
        logger.log('🗂️ Test du File Queue Provider...');
        
        // Créer un provider de fichier
        const fileQueue = FileQueueProvider.create('test-queue', './test-queue-data');
        
        logger.log('✅ File Queue Provider créé');
        logger.log(`📁 Fichier de queue: ${fileQueue.getQueueFilePath()}`);
        
        // Test de santé
        const isHealthy = await fileQueue.isHealthy();
        logger.log(`🏥 Health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
        
        // Test d'ajout de jobs
        logger.log('📤 Ajout de jobs de test...');
        
        const job1 = await fileQueue.add('test-job', {
            message: 'Hello from File Queue!',
            timestamp: new Date().toISOString(),
        });
        logger.log(`✅ Job 1 ajouté: ${job1.id}`);
        
        const job2 = await fileQueue.add('test-job', {
            message: 'Another test job',
            number: 42,
        });
        logger.log(`✅ Job 2 ajouté: ${job2.id}`);
        
        // Enregistrer un processor
        logger.log('🔄 Enregistrement du processor...');
        await fileQueue.process('test-job', async (job) => {
            logger.log(`⚙️ Processing job ${job.id}: ${JSON.stringify(job.data)}`);
            
            // Simuler un traitement
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                processed: true,
                jobId: job.id,
                result: `Processed: ${job.data.message || 'no message'}`,
            };
        });
        
        logger.log('✅ Processor enregistré');
        
        // Attendre un peu pour voir le traitement
        logger.log('⏳ Attente de 5 secondes pour voir le traitement...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Statistiques
        const stats = await fileQueue.getStats();
        logger.log('📊 Statistiques finales:');
        logger.log(JSON.stringify(stats, null, 2));
        
        // Test de nettoyage
        logger.log('🧹 Test de nettoyage...');
        await fileQueue.clean(1000); // Nettoyer les jobs de plus de 1 seconde
        
        const statsAfterClean = await fileQueue.getStats();
        logger.log('📊 Statistiques après nettoyage:');
        logger.log(JSON.stringify(statsAfterClean, null, 2));
        
        // Fermeture
        logger.log('🔒 Fermeture du File Queue Provider...');
        await fileQueue.close();
        
        logger.log('🎉 Test terminé avec succès !');
        
    } catch (error) {
        logger.error('❌ Erreur pendant le test:', error.message);
        logger.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Lancer le test
testFileQueue();