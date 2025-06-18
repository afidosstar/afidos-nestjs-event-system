import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
    const logger = new Logger('Worker');
    
    try {
        logger.log('🚀 Starting worker process...');
        
        const app = await NestFactory.create(WorkerModule, {
            logger: ['log', 'error', 'warn', 'debug']
        });

        // Démarrage du worker
        await app.init();
        
        logger.log('✅ Worker started and listening for events...');
        logger.log('📋 Available providers: Email, Telegram, Webhook');
        logger.log('🔄 Processing mode: worker (queue-based)');
        
        // Heartbeat optionnel
        setInterval(() => {
            logger.debug('💓 Worker heartbeat - Ready for jobs');
        }, 30000);

        // Gestion des signaux pour arrêt propre
        process.on('SIGTERM', async () => {
            logger.log('📤 SIGTERM received, shutting down worker gracefully...');
            await app.close();
            process.exit(0);
        });

        process.on('SIGINT', async () => {
            logger.log('📤 SIGINT received, shutting down worker gracefully...');
            await app.close();
            process.exit(0);
        });

    } catch (error) {
        logger.error('❌ Worker failed to start:', error);
        process.exit(1);
    }
}

bootstrap();