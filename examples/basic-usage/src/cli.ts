#!/usr/bin/env node

import { CommandFactory } from 'nest-commander';
import { CliModule } from './cli.module';

async function bootstrap() {
    console.log('🚀 Démarrage CLI...');
    await CommandFactory.run(CliModule, ['log', 'warn', 'error']);
}

bootstrap().catch((error) => {
    console.error('❌ Erreur CLI:', error);
    process.exit(1);
});