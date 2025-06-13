const { execSync } = require('child_process');

console.log('🧪 Running tests for @afidos/nestjs-event-notifications...');

try {
  // Unit tests
  console.log('🔬 Running unit tests...');
  execSync('jest --testPathPattern=src/.*\\.spec\\.ts, { stdio: 'inherit' });

  // Integration tests
  console.log('🔗 Running integration tests...');
  execSync('jest --testPathPattern=tests/integration', { stdio: 'inherit' });

  // E2E tests
  console.log('🌐 Running e2e tests...');
  execSync('jest --testPathPattern=tests/e2e', { stdio: 'inherit' });

  console.log('✅ All tests passed!');
} catch (error) {
  console.error('❌ Tests failed!');
  process.exit(1);
}
