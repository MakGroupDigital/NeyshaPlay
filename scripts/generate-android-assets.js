#!/usr/bin/env node

/**
 * Script to generate Android app icons and splash screens from Cloudinary logo
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const LOGO_URL = 'https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554691/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_12.58.04_t2ltgj.png';

// Android icon sizes (mipmap densities)
const iconSizes = [
  { size: 48, density: 'mdpi' },
  { size: 72, density: 'hdpi' },
  { size: 96, density: 'xhdpi' },
  { size: 144, density: 'xxhdpi' },
  { size: 192, density: 'xxxhdpi' },
];

// Splash screen sizes
const splashSizes = [
  { width: 320, height: 480, density: 'mdpi' },
  { width: 480, height: 800, density: 'hdpi' },
  { width: 720, height: 1280, density: 'xhdpi' },
  { width: 1080, height: 1920, density: 'xxhdpi' },
  { width: 1440, height: 2560, density: 'xxxhdpi' },
];

console.log('🎨 Generating Android assets from Cloudinary logo...\n');

// Create directories
const androidResPath = path.join(__dirname, '../android/app/src/main/res');
if (!fs.existsSync(androidResPath)) {
  console.log('⚠️  Android project not found. Run "npx cap add android" first.\n');
  process.exit(1);
}

let completed = 0;
const total = iconSizes.length + splashSizes.length;

// Generate app icons
console.log('📱 Generating app icons...\n');
iconSizes.forEach(({ size, density }) => {
  const dir = path.join(androidResPath, `mipmap-${density}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const transformedUrl = LOGO_URL.replace(
    '/upload/',
    `/upload/w_${size},h_${size},c_fill,f_png,q_auto/`
  );

  const outputPath = path.join(dir, 'ic_launcher.png');
  const file = fs.createWriteStream(outputPath);

  console.log(`  📥 Downloading ${density} (${size}x${size})...`);

  https.get(transformedUrl, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      completed++;
      console.log(`  ✅ Generated mipmap-${density}/ic_launcher.png`);
      
      // Also create round icon
      const roundPath = path.join(dir, 'ic_launcher_round.png');
      fs.copyFileSync(outputPath, roundPath);
      
      if (completed === total) {
        console.log('\n🎉 All Android assets generated successfully!\n');
      }
    });
  }).on('error', (err) => {
    console.error(`  ❌ Error generating ${density}:`, err.message);
  });
});

// Generate splash screens
setTimeout(() => {
  console.log('\n🖼️  Generating splash screens...\n');
  
  splashSizes.forEach(({ width, height, density }) => {
    const dir = path.join(androidResPath, `drawable-${density}`);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create splash with logo centered on dark background
    const logoSize = Math.min(width, height) * 0.4; // Logo takes 40% of smallest dimension
    
    const transformedUrl = LOGO_URL.replace(
      '/upload/',
      `/upload/w_${Math.round(logoSize)},h_${Math.round(logoSize)},c_fill,b_rgb:111111,w_${width},h_${height},c_lpad,f_png,q_auto/`
    );

    const outputPath = path.join(dir, 'splash.png');
    const file = fs.createWriteStream(outputPath);

    console.log(`  📥 Downloading ${density} (${width}x${height})...`);

    https.get(transformedUrl, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        completed++;
        console.log(`  ✅ Generated drawable-${density}/splash.png`);
        
        if (completed === total) {
          console.log('\n🎉 All Android assets generated successfully!\n');
        }
      });
    }).on('error', (err) => {
      console.error(`  ❌ Error generating ${density}:`, err.message);
    });
  });
}, 3000);
