#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting notification worker...');

const workerPath = path.join(__dirname, '../examples/basic-usage/dist/worker.js');
const worker = spawn('node', [workerPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production',
    WORKER_MODE: 'true'
  }
});

worker.on('close', (code) => {
  console.log(`Worker exited with code ${code}`);
  process.exit(code);
});

worker.on('error', (error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});

// Gestion gracieuse des signaux
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, stopping worker...');
  worker.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, stopping worker...');
  worker.kill('SIGINT');
});
