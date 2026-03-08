# 🚀 Guide de Démarrage Rapide - NeyshaPlay

## ⚡ Configuration en 5 Minutes

### Étape 1 : Cloudinary (2 min)

1. **Créer un compte** : [cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)

2. **Récupérer vos credentials** dans le Dashboard :
   - Cloud Name
   - API Key  
   - API Secret

3. **Créer un Upload Preset** :
   - Allez dans Settings > Upload
   - Cliquez "Add upload preset"
   - Nom : `neyshaplay_videos`
   - Signing Mode : **Unsigned**
   - Folder : `neyshaplay/videos`
   - Sauvegardez

### Étape 2 : Configuration Locale (1 min)

1. **Copier le fichier d'exemple** :
```bash
cp .env.example .env.local
```

2. **Remplir les credentials** dans `.env.local` :
```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=votre_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=neyshaplay_videos
```

### Étape 3 : Lancer l'App (2 min)

```bash
# Installer les dépendances (si pas déjà fait)
npm install

# Lancer le serveur
npm run dev
```

🎉 **C'est tout !** Ouvrez [http://localhost:9002](http://localhost:9002)

---

## 🧪 Tester l'Application

### 1. Connexion
- Cliquez sur "Continuer avec Google"
- Choisissez votre compte Google
- Sélectionnez "Créateur" ou "Utilisateur"

### 2. Créer une Vidéo
- Cliquez sur l'icône "+" en bas
- Autorisez l'accès à la caméra
- Appuyez sur le bouton rouge pour enregistrer
- Testez les filtres et effets
- Ajoutez une légende
- Publiez !

### 3. Explorer
- Retournez au feed (icône maison)
- Scrollez verticalement pour voir les vidéos
- Likez, commentez (bientôt)
- Visitez votre profil

---

## 🔧 Commandes Utiles

```bash
# Développement
npm run dev              # Serveur de dev (port 9002)

# Production
npm run build            # Build optimisé
npm run start            # Serveur de production

# Qualité du code
npm run lint             # Vérifier le code
npm run typecheck        # Vérifier les types

# AI (optionnel)
npm run genkit:dev       # Serveur Genkit
```

---

## 📱 Fonctionnalités Disponibles

### ✅ Implémenté
- [x] Authentification Google
- [x] Sélection du rôle (User/Creator)
- [x] Création de vidéos (15s max)
- [x] 8 filtres en temps réel
- [x] Contrôle de vitesse
- [x] Upload vers Cloudinary
- [x] Feed de vidéos
- [x] Profil utilisateur
- [x] Optimistic UI

### 🚧 En Développement
- [ ] Likes persistants
- [ ] Commentaires
- [ ] Partage
- [ ] Follow/Unfollow
- [ ] Notifications

---

## 🐛 Problèmes Courants

### "Upload preset not found"
➡️ Vérifiez que le preset existe et est en mode "Unsigned"

### "Camera permission denied"
➡️ Autorisez la caméra dans les paramètres du navigateur

### "Port 9002 already in use"
➡️ Tuez le processus : `lsof -ti:9002 | xargs kill -9`

### Variables d'environnement non chargées
➡️ Redémarrez le serveur après modification de `.env.local`

---

## 📚 Documentation Complète

Pour plus de détails, consultez :

- [📖 Contexte du Projet](./docs/CONTEXTE_PROJET.md)
- [☁️ Configuration Cloudinary](./docs/CLOUDINARY_SETUP.md)
- [🚀 Fonctionnalités Futures](./docs/FONCTIONNALITES_FUTURES.md)
- [📝 Changelog](./docs/CHANGELOG.md)

---

## 💡 Conseils

### Performance
- Utilisez Chrome ou Edge pour de meilleures performances
- Activez le mode sombre (déjà par défaut)
- Fermez les autres onglets pendant l'enregistrement

### Développement
- Utilisez les DevTools React pour déboguer
- Consultez la console pour les logs
- Testez sur mobile avec le mode responsive

### Production
- Configurez un upload signé Cloudinary
- Ajoutez des tests
- Configurez un CI/CD
- Activez Firebase Analytics

---

## 🎯 Prochaines Étapes

1. **Testez l'application** : Créez quelques vidéos
2. **Explorez le code** : Familiarisez-vous avec l'architecture
3. **Consultez la roadmap** : Voir ce qui est prévu
4. **Contribuez** : Proposez des améliorations

---

**Besoin d'aide ?** Créez une issue sur GitHub ou consultez la documentation.

**Version** : 0.2.0  
**Dernière mise à jour** : Mars 2026
