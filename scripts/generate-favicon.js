#!/usr/bin/env node

/**
 * Script to generate favicon from Cloudinary logo
 * This uses Cloudinary's transformation API to create optimized favicon sizes
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const LOGO_URL = 'https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554691/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_12.58.04_t2ltgj.png';
const OUTPUT_DIR = path.join(__dirname, '../public');

// Cloudinary transformations for different favicon sizes
const faviconSizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
];

// Create public directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('🎨 Generating favicons from Cloudinary logo...\n');

// Generate each favicon size
faviconSizes.forEach(({ size, name }) => {
  // Cloudinary transformation URL: resize, crop to square, format as PNG
  const transformedUrl = LOGO_URL.replace(
    '/upload/',
    `/upload/w_${size},h_${size},c_fill,f_png,q_auto/`
  );
  
  const outputPath = path.join(OUTPUT_DIR, name);
  const file = fs.createWriteStream(outputPath);
  
  console.log(`📥 Downloading ${name} (${size}x${size})...`);
  
  https.get(transformedUrl, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`✅ Generated ${name}`);
    });
  }).on('error', (err) => {
    fs.unlink(outputPath, () => {});
    console.error(`❌ Error generating ${name}:`, err.message);
  });
});

// Generate favicon.ico (using 32x32 as base)
setTimeout(() => {
  const faviconUrl = LOGO_URL.replace(
    '/upload/',
    '/upload/w_32,h_32,c_fill,f_ico,q_auto/'
  );
  
  const outputPath = path.join(OUTPUT_DIR, 'favicon.ico');
  const file = fs.createWriteStream(outputPath);
  
  console.log('\n📥 Downloading favicon.ico...');
  
  https.get(faviconUrl, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('✅ Generated favicon.ico');
      console.log('\n🎉 All favicons generated successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Check the /public directory for generated files');
      console.log('   2. Update your layout.tsx metadata');
      console.log('   3. Add a site.webmanifest file for PWA support\n');
    });
  }).on('error', (err) => {
    fs.unlink(outputPath, () => {});
    console.error('❌ Error generating favicon.ico:', err.message);
  });
}, 2000);
