#!/usr/bin/env node

/**
 * Script pour configurer automatiquement Cloudinary
 * Crée l'upload preset nécessaire pour l'application
 */

const https = require('https');

// Configuration depuis les variables d'environnement
const CLOUD_NAME = 'doe4jempg';
const API_KEY = '828292343673526';
const API_SECRET = 'd0YIaf2p_zJpruJKl3t9fisUqJI';
const PRESET_NAME = 'neyshaplay_videos';

console.log('🚀 Configuration de Cloudinary...\n');

// Créer l'upload preset
const presetData = JSON.stringify({
  name: PRESET_NAME,
  unsigned: true,
  folder: 'neyshaplay/videos',
  resource_type: 'auto',
  access_mode: 'public',
  tags: ['neyshaplay', 'video'],
  allowed_formats: ['mp4', 'webm', 'mov', 'avi'],
});

const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

const options = {
  hostname: 'api.cloudinary.com',
  port: 443,
  path: `/v1_1/${CLOUD_NAME}/upload_presets`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': presetData.length,
    'Authorization': `Basic ${auth}`,
  },
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Upload preset créé avec succès !');
      console.log(`   Nom: ${PRESET_NAME}`);
      console.log(`   Mode: Unsigned`);
      console.log(`   Dossier: neyshaplay/videos\n`);
      console.log('🎉 Configuration terminée ! Vous pouvez maintenant uploader des vidéos.\n');
    } else if (res.statusCode === 409) {
      console.log('ℹ️  Upload preset existe déjà.');
      console.log(`   Nom: ${PRESET_NAME}\n`);
      console.log('✅ Configuration OK ! Vous pouvez uploader des vidéos.\n');
    } else {
      console.error('❌ Erreur lors de la création du preset:');
      console.error(`   Status: ${res.statusCode}`);
      console.error(`   Response: ${data}\n`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erreur de connexion à Cloudinary:');
  console.error(`   ${error.message}\n`);
  console.log('💡 Vérifiez vos credentials dans .env.local\n');
});

req.write(presetData);
req.end();
