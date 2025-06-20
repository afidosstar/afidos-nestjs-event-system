const { execSync } = require('child_process');

try {
    console.log('🔄 Test de la commande de synchronisation...');
    
    // Exécuter la commande de sync
    const result = execSync('npm run sync-events', { 
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 30000
    });
    
    console.log('✅ Commande exécutée avec succès');
    console.log('Sortie:', result);
    
} catch (error) {
    console.error('❌ Erreur lors de l\'exécution:', error.message);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
}