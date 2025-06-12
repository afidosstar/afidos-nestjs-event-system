const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building @afidos/nestjs-event-notifications...');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}

// TypeScript compilation
console.log('📝 Compiling TypeScript...');
execSync('tsc', { stdio: 'inherit' });

// Copy package.json metadata
console.log('📋 Copying package metadata...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const distPackageJson = {
  ...packageJson,
  main: 'index.js',
  types: 'index.d.ts',
  scripts: undefined,
  devDependencies: undefined,
};

fs.writeFileSync(
  path.join('dist', 'package.json'),
  JSON.stringify(distPackageJson, null, 2)
);

// Copy README and other files
console.log('📚 Copying documentation...');
fs.copyFileSync('README.md', 'dist/README.md');
fs.copyFileSync('CHANGELOG.md', 'dist/CHANGELOG.md');

console.log('✅ Build completed successfully!');
