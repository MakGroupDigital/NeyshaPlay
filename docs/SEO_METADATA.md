# Métadonnées et SEO - NeyshaPlay

## 📋 Vue d'ensemble

Ce document décrit toutes les métadonnées et configurations SEO mises en place pour NeyshaPlay.

## 🎨 Favicons et Icônes

Tous les favicons ont été générés à partir du logo Cloudinary et sont optimisés pour différentes plateformes:

### Fichiers générés
- `favicon.ico` - 32x32px (format ICO pour compatibilité maximale)
- `favicon-16x16.png` - 16x16px (petite taille navigateur)
- `favicon-32x32.png` - 32x32px (taille standard navigateur)
- `apple-touch-icon.png` - 180x180px (iOS/Safari)
- `android-chrome-192x192.png` - 192x192px (Android)
- `android-chrome-512x512.png` - 512x512px (Android haute résolution)

### Régénération des favicons

Pour régénérer les favicons à partir du logo Cloudinary:

```bash
node scripts/generate-favicon.js
```

## 🌐 Métadonnées principales

### Titre et description
- **Titre**: NeyshaPlay - Vidéos Courtes & Créativité
- **Description**: Plongez dans un univers de vidéos courtes, créez, partagez et découvrez des contenus captivants
- **Mots-clés**: vidéo, création, partage, musique, danse, divertissement, réseaux sociaux, tiktok, reels, shorts, contenu créateur, monétisation

### Open Graph (Facebook, LinkedIn, etc.)
- Titre optimisé pour le partage social
- Image de prévisualisation: 1200x630px
- Type: website
- Locale: fr_FR

### Twitter Card
- Type: summary_large_image
- Image optimisée pour Twitter
- Description courte et engageante

## 📱 Progressive Web App (PWA)

### Manifest (`site.webmanifest`)
- Nom complet: NeyshaPlay
- Nom court: NeyshaPlay
- Mode d'affichage: standalone (comme une app native)
- Orientation: portrait
- Couleur de thème: #c3ff00 (vert néon)
- Couleur de fond: #111111 (noir)

### Apple Web App
- Capable: true (peut être ajouté à l'écran d'accueil)
- Style de barre d'état: black-translucent
- Titre: NeyshaPlay

## 🤖 Robots et SEO

### robots.txt
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Sitemap: https://neyshaplay.com/sitemap.xml
```

### Configuration robots
- Index: activé
- Follow: activé
- Max video preview: illimité
- Max image preview: large
- Max snippet: illimité

## 🔍 Vérification des moteurs de recherche

Pour améliorer le référencement, ajoutez les codes de vérification dans `src/app/layout.tsx`:

```typescript
verification: {
  google: 'votre-code-google',
  yandex: 'votre-code-yandex',
}
```

### Comment obtenir les codes de vérification

1. **Google Search Console**
   - Allez sur https://search.google.com/search-console
   - Ajoutez votre propriété
   - Choisissez "Balise HTML" comme méthode de vérification
   - Copiez le code de vérification

2. **Bing Webmaster Tools**
   - Allez sur https://www.bing.com/webmasters
   - Ajoutez votre site
   - Utilisez la méthode de vérification par balise meta

## 📊 Métadonnées structurées (à venir)

Pour améliorer encore le SEO, considérez d'ajouter:

### Schema.org JSON-LD
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "NeyshaPlay",
  "description": "Plateforme de vidéos courtes",
  "applicationCategory": "EntertainmentApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

## 🎯 Recommandations SEO

### Contenu
- ✅ Titres uniques pour chaque page
- ✅ Descriptions meta optimisées
- ✅ Mots-clés pertinents
- ⏳ Sitemap XML (à générer)
- ⏳ Contenu structuré avec Schema.org

### Performance
- ✅ Images optimisées via Cloudinary
- ✅ Lazy loading des vidéos
- ✅ Préchargement des polices
- ✅ Compression des assets

### Mobile
- ✅ Design responsive
- ✅ Viewport configuré
- ✅ Touch-friendly
- ✅ PWA ready

### Réseaux sociaux
- ✅ Open Graph configuré
- ✅ Twitter Cards configurées
- ✅ Images de partage optimisées

## 🔗 Liens utiles

- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [Schema.org](https://schema.org/)

## 📝 Checklist de déploiement

Avant de déployer en production:

- [ ] Vérifier que tous les favicons sont présents
- [ ] Tester les métadonnées avec les outils de débogage
- [ ] Ajouter les codes de vérification des moteurs de recherche
- [ ] Générer et soumettre le sitemap XML
- [ ] Tester le partage sur les réseaux sociaux
- [ ] Vérifier l'affichage PWA sur mobile
- [ ] Configurer Google Analytics (si nécessaire)
- [ ] Tester les performances avec Lighthouse

## 🚀 Prochaines étapes

1. Générer un sitemap XML dynamique
2. Ajouter Schema.org JSON-LD pour les vidéos
3. Implémenter les balises meta dynamiques par page
4. Configurer les analytics et le tracking
5. Optimiser pour les Core Web Vitals
