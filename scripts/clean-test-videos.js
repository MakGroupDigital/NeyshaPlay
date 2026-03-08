#!/usr/bin/env node

/**
 * Script pour nettoyer les vidéos de test sans utilisateur valide
 * À exécuter en développement uniquement
 */

console.log('🧹 Nettoyage des vidéos de test...\n');
console.log('⚠️  Ce script doit être exécuté manuellement depuis Firebase Console\n');
console.log('📋 Instructions:\n');
console.log('1. Allez sur https://console.firebase.google.com');
console.log('2. Sélectionnez votre projet: studio-4725166594-b0358');
console.log('3. Allez dans Firestore Database');
console.log('4. Ouvrez la collection "videos"');
console.log('5. Supprimez les vidéos qui ont des userRef invalides\n');
console.log('💡 Ou utilisez la console Firebase pour exécuter cette requête:\n');
console.log('   - Filtrer par: userRef == null');
console.log('   - Supprimer tous les résultats\n');
console.log('✅ Une fois nettoyé, rechargez l\'application\n');
