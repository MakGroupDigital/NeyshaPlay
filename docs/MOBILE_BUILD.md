# Guide de Build Mobile - NeyshaPlay

## 📱 Vue d'ensemble

Ce guide explique comment générer une APK Android pour NeyshaPlay en utilisant Capacitor.

## 🛠️ Prérequis

### Logiciels requis
- Node.js 18+ et npm
- Android Studio (dernière version)
- JDK 17 ou supérieur
- Android SDK (API 33+)

### Variables d'environnement
Assurez-vous que votre fichier `.env.local` contient toutes les clés nécessaires:
```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## 🚀 Processus de Build

### Méthode 1: Script automatisé (Recommandé)

```bash
# Build complet avec sync Capacitor
npm run build:mobile
```

Ce script:
1. Sauvegarde les routes dynamiques temporairement
2. Utilise la configuration mobile (next.config.mobile.ts)
3. Build l'application Next.js en mode export
4. Synchronise avec Capacitor
5. Restaure la configuration originale

### Méthode 2: Build manuel

Si le script automatisé échoue, suivez ces étapes:

#### Étape 1: Préparer le code
```bash
# Supprimer temporairement les routes dynamiques
mv src/app/u/[id] src/app/u/_[id]_backup
mv src/app/settings src/app/_settings_backup
```

#### Étape 2: Configurer pour l'export
Modifiez `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  // ... reste de la config
};
```

#### Étape 3: Build Next.js
```bash
npm run build
```

#### Étape 4: Vérifier le build
```bash
ls -la out/
# Doit contenir index.html et les assets
```

#### Étape 5: Sync Capacitor
```bash
npx cap sync android
```

#### Étape 6: Restaurer le code
```bash
mv src/app/u/_[id]_backup src/app/u/[id]
mv src/app/_settings_backup src/app/settings
# Restaurer next.config.ts original
```

## 📦 Générer l'APK

### Option A: Avec Android Studio (Interface graphique)

1. Ouvrir le projet Android:
```bash
npm run cap:open:android
```

2. Dans Android Studio:
   - Build > Generate Signed Bundle / APK
   - Choisir "APK"
   - Créer ou sélectionner un keystore
   - Choisir "release"
   - Cliquer sur "Finish"

3. L'APK sera dans: `android/app/build/outputs/apk/release/`

### Option B: Avec Gradle (Ligne de commande)

#### APK Debug (pour tests)
```bash
cd android
./gradlew assembleDebug
```
APK généré: `android/app/build/outputs/apk/debug/app-debug.apk`

#### APK Release (pour production)
```bash
cd android
./gradlew assembleRelease
```
APK généré: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

⚠️ **Note**: L'APK release doit être signé avant distribution.

## 🔐 Signature de l'APK

### Créer un keystore

```bash
keytool -genkey -v -keystore neyshaplay-release.keystore \
  -alias neyshaplay -keyalg RSA -keysize 2048 -validity 10000
```

### Configurer la signature

Créez `android/key.properties`:
```properties
storePassword=VOTRE_MOT_DE_PASSE
keyPassword=VOTRE_MOT_DE_PASSE
keyAlias=neyshaplay
storeFile=../neyshaplay-release.keystore
```

⚠️ **Important**: Ajoutez `key.properties` et `*.keystore` au `.gitignore`!

### Modifier `android/app/build.gradle`

Ajoutez avant `android {`:
```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

Dans `android { ... }`, ajoutez:
```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
        storePassword keystoreProperties['storePassword']
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### Générer l'APK signé
```bash
cd android
./gradlew assembleRelease
```

L'APK signé sera dans: `android/app/build/outputs/apk/release/app-release.apk`

## 🧪 Tester l'APK

### Sur émulateur
```bash
npm run cap:run:android
```

### Sur appareil physique

1. Activer le mode développeur sur votre appareil
2. Activer le débogage USB
3. Connecter l'appareil
4. Installer l'APK:
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

## 📋 Checklist avant release

- [ ] Toutes les fonctionnalités testées
- [ ] Variables d'environnement configurées
- [ ] Version mise à jour dans `package.json`
- [ ] Version mise à jour dans `android/app/build.gradle`
- [ ] APK signé avec le keystore de production
- [ ] APK testé sur plusieurs appareils
- [ ] Taille de l'APK optimisée (< 50MB recommandé)
- [ ] Permissions Android vérifiées dans `AndroidManifest.xml`
- [ ] Icônes et splash screen configurés

## 🔧 Configuration Android

### Permissions requises

Dans `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### Version de l'app

Dans `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        applicationId "com.neyshaplay.app"
        minSdkVersion 22
        targetSdkVersion 33
        versionCode 1
        versionName "1.0.0"
    }
}
```

## 🐛 Dépannage

### Erreur: "index.html not found"
- Vérifiez que `output: 'export'` est dans next.config.ts
- Vérifiez que `trailingSlash: true` est configuré
- Supprimez le dossier `out/` et rebuilder

### Erreur: "Page with dynamic route"
- Assurez-vous que les routes dynamiques sont sauvegardées
- Vérifiez que le script de build les a bien déplacées

### Erreur Gradle
```bash
cd android
./gradlew clean
./gradlew assembleRelease
```

### APK trop volumineux
- Activez ProGuard dans `build.gradle`
- Utilisez `bundleRelease` au lieu de `assembleRelease` (génère un AAB)
- Optimisez les images et assets

### Problèmes de signature
- Vérifiez que le keystore existe
- Vérifiez les chemins dans `key.properties`
- Vérifiez les mots de passe

## 📊 Optimisations

### Réduire la taille de l'APK

1. **Activer ProGuard**:
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```

2. **Générer un AAB** (Android App Bundle):
```bash
./gradlew bundleRelease
```

3. **Splits par ABI**:
```gradle
android {
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
            universalApk false
        }
    }
}
```

## 📱 Distribution

### Google Play Store
1. Créer un compte développeur Google Play
2. Créer une nouvelle application
3. Uploader l'AAB (recommandé) ou l'APK signé
4. Remplir les informations de l'app
5. Soumettre pour review

### Distribution directe
- Héberger l'APK sur votre serveur
- Partager le lien de téléchargement
- Les utilisateurs devront activer "Sources inconnues"

## 🔗 Ressources

- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Android Developer Guide](https://developer.android.com/studio/publish)
- [Signing Your App](https://developer.android.com/studio/publish/app-signing)

## 💡 Conseils

- Gardez votre keystore en sécurité (backup multiple)
- Ne commitez jamais les mots de passe dans Git
- Testez sur plusieurs versions d'Android
- Utilisez Firebase App Distribution pour les bêta tests
- Configurez CI/CD pour automatiser les builds
