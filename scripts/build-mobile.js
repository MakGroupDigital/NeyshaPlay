#!/usr/bin/env node

/**
 * Script to build the mobile app with Capacitor
 * This temporarily removes dynamic routes for static export
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Building NeyshaPlay for mobile...\n');

// Backup dynamic route
const dynamicRoutePath = path.join(__dirname, '../src/app/u/[id]');
const backupPath = path.join(__dirname, '../src/app/u/_[id]_backup');
const settingsPath = path.join(__dirname, '../src/app/settings');
const settingsBackupPath = path.join(__dirname, '../src/app/_settings_backup');

console.log('📦 Backing up dynamic routes...');
if (fs.existsSync(dynamicRoutePath)) {
  if (fs.existsSync(backupPath)) {
    fs.rmSync(backupPath, { recursive: true });
  }
  fs.renameSync(dynamicRoutePath, backupPath);
  console.log('✅ Dynamic routes backed up');
}

// Backup settings page (not essential for mobile)
if (fs.existsSync(settingsPath)) {
  if (fs.existsSync(settingsBackupPath)) {
    fs.rmSync(settingsBackupPath, { recursive: true });
  }
  fs.renameSync(settingsPath, settingsBackupPath);
  console.log('✅ Settings page backed up\n');
}

try {
  // Clean previous build
  const outDir = path.join(__dirname, '../out');
  if (fs.existsSync(outDir)) {
    console.log('🧹 Cleaning previous build...');
    fs.rmSync(outDir, { recursive: true });
    console.log('✅ Clean complete\n');
  }

  // Swap next.config for mobile build
  const nextConfigPath = path.join(__dirname, '../next.config.ts');
  const nextConfigMobilePath = path.join(__dirname, '../next.config.mobile.ts');
  const nextConfigBackupPath = path.join(__dirname, '../next.config.backup.ts');
  
  console.log('🔧 Switching to mobile configuration...');
  fs.copyFileSync(nextConfigPath, nextConfigBackupPath);
  fs.copyFileSync(nextConfigMobilePath, nextConfigPath);
  console.log('✅ Mobile configuration active\n');

  // Build Next.js app
  console.log('🔨 Building Next.js app...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Next.js build complete\n');
  
  // Restore original config
  console.log('🔧 Restoring original configuration...');
  fs.copyFileSync(nextConfigBackupPath, nextConfigPath);
  fs.unlinkSync(nextConfigBackupPath);
  console.log('✅ Configuration restored\n');

  // Check if index.html exists
  const indexPath = path.join(outDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('❌ Error: index.html not found in out directory');
    process.exit(1);
  }

  // Sync with Capacitor
  console.log('📱 Syncing with Capacitor...');
  execSync('npx cap sync android', { stdio: 'inherit' });
  console.log('✅ Capacitor sync complete\n');

  console.log('🎉 Build successful!');
  console.log('\n📝 Next steps:');
  console.log('   1. Open Android Studio: npm run cap:open:android');
  console.log('   2. Build > Generate Signed Bundle / APK');
  console.log('   3. Choose APK and follow the wizard\n');
  console.log('💡 Or build directly with Gradle:');
  console.log('   cd android && ./gradlew assembleRelease\n');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  
  // Restore config if it exists
  const nextConfigBackupPath = path.join(__dirname, '../next.config.backup.ts');
  if (fs.existsSync(nextConfigBackupPath)) {
    const nextConfigPath = path.join(__dirname, '../next.config.ts');
    fs.copyFileSync(nextConfigBackupPath, nextConfigPath);
    fs.unlinkSync(nextConfigBackupPath);
    console.log('✅ Configuration restored after error\n');
  }
  
  process.exit(1);
} finally {
  // Restore dynamic route
  console.log('\n🔄 Restoring backed up files...');
  if (fs.existsSync(backupPath)) {
    if (fs.existsSync(dynamicRoutePath)) {
      fs.rmSync(dynamicRoutePath, { recursive: true });
    }
    fs.renameSync(backupPath, dynamicRoutePath);
    console.log('✅ Dynamic routes restored');
  }
  
  if (fs.existsSync(settingsBackupPath)) {
    if (fs.existsSync(settingsPath)) {
      fs.rmSync(settingsPath, { recursive: true });
    }
    fs.renameSync(settingsBackupPath, settingsPath);
    console.log('✅ Settings page restored\n');
  }
}
