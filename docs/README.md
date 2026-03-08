# 📚 Documentation NeyshaPlay

Bienvenue dans la documentation complète du projet NeyshaPlay !

## 📖 Documents Disponibles

### 1. [CONTEXTE_PROJET.md](./CONTEXTE_PROJET.md)
**Document principal de référence du projet**

Contient :
- Vue d'ensemble de l'application
- Architecture technique complète
- Stack technologique
- Structure du projet
- Design system et guidelines
- Modèles de données
- Configuration Firebase
- Fonctionnalités actuelles
- Scripts disponibles
- Dépendances clés
- Workflow de développement

📌 **À consulter pour** : Comprendre l'architecture globale, onboarding de nouveaux développeurs, référence technique

---

### 2. [FONCTIONNALITES_FUTURES.md](./FONCTIONNALITES_FUTURES.md)
**Roadmap et planification des fonctionnalités**

Contient :
- Template pour documenter les nouvelles fonctionnalités
- 15 fonctionnalités planifiées organisées en 5 phases
- Détails d'implémentation pour chaque fonctionnalité
- Statuts et priorités
- Tests à effectuer
- Suivi global du projet

📌 **À consulter pour** : Planifier le développement, suivre l'avancement, documenter les nouvelles features

---

### 3. [blueprint.md](./blueprint.md)
**Spécifications de design originales**

Contient :
- Fonctionnalités principales
- Guidelines de style
- Palette de couleurs
- Typographie
- Principes de design

📌 **À consulter pour** : Respecter le design system, créer de nouveaux composants UI

---

### 4. [backend.json](./backend.json)
**Configuration backend**

Contient :
- Configuration des services backend
- Endpoints API
- Structure de données

📌 **À consulter pour** : Intégration backend, configuration des services

---

## 🚀 Démarrage Rapide

### Installation

```bash
# Cloner le projet
git clone [url-du-repo]

# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

L'application sera accessible sur : http://localhost:9002

### Scripts Disponibles

```bash
npm run dev          # Serveur de développement (port 9002)
npm run build        # Build de production
npm run start        # Serveur de production
npm run lint         # Linter ESLint
npm run typecheck    # Vérification TypeScript
npm run genkit:dev   # Serveur Genkit AI
npm run genkit:watch # Genkit en mode watch
```

---

## 🏗️ Structure de la Documentation

```
docs/
├── README.md                    # Ce fichier (index de la documentation)
├── CONTEXTE_PROJET.md          # Documentation technique complète
├── FONCTIONNALITES_FUTURES.md  # Roadmap et planification
├── blueprint.md                # Spécifications de design
└── backend.json                # Configuration backend
```

---

## 📝 Comment Contribuer à la Documentation

### Ajouter une Nouvelle Fonctionnalité

1. Ouvrir `FONCTIONNALITES_FUTURES.md`
2. Copier le template fourni
3. Remplir tous les champs :
   - Nom et description
   - Statut et priorité
   - Fichiers concernés
   - Dépendances
   - Étapes d'implémentation
   - Tests à effectuer
4. Mettre à jour les statistiques en bas du document

### Mettre à Jour le Contexte Projet

Lorsque vous ajoutez une fonctionnalité majeure :

1. Ouvrir `CONTEXTE_PROJET.md`
2. Mettre à jour la section concernée :
   - Ajouter les nouveaux modèles de données dans "Modèles de Données"
   - Documenter les nouvelles routes dans "Fonctionnalités Principales"
   - Ajouter les nouvelles dépendances dans "Dépendances Clés"
3. Mettre à jour la date de dernière modification

### Documenter un Bug ou Problème Connu

1. Ouvrir `CONTEXTE_PROJET.md`
2. Ajouter dans la section "Problèmes Connus"
3. Décrire le problème et les étapes pour le reproduire
4. Proposer une solution si possible

---

## 🎯 Workflow de Développement

### 1. Avant de Commencer une Fonctionnalité

- [ ] Lire `CONTEXTE_PROJET.md` pour comprendre l'architecture
- [ ] Consulter `FONCTIONNALITES_FUTURES.md` pour voir si la fonctionnalité est déjà planifiée
- [ ] Vérifier `blueprint.md` pour respecter le design system
- [ ] Créer une branche feature : `git checkout -b feature/nom-fonctionnalite`

### 2. Pendant le Développement

- [ ] Suivre les étapes d'implémentation documentées
- [ ] Respecter les conventions de code
- [ ] Ajouter des commentaires pour le code complexe
- [ ] Mettre à jour le statut dans `FONCTIONNALITES_FUTURES.md`

### 3. Après l'Implémentation

- [ ] Effectuer tous les tests listés
- [ ] Mettre à jour `CONTEXTE_PROJET.md` si nécessaire
- [ ] Marquer la fonctionnalité comme terminée 🟢
- [ ] Créer une pull request avec description détaillée
- [ ] Mettre à jour la documentation si l'API a changé

---

## 🔍 Index des Fonctionnalités

### Fonctionnalités Actuelles

- ✅ Feed de vidéos avec défilement vertical
- ✅ Création de vidéos avec caméra
- ✅ Filtres et effets en temps réel
- ✅ Page de découverte
- ✅ Profil utilisateur
- ✅ Authentification Firebase
- ✅ Upload vers Firebase Storage

### Fonctionnalités en Développement

Consultez `FONCTIONNALITES_FUTURES.md` pour la liste complète.

### Prochaines Priorités (Phase 1)

1. Système de likes en temps réel
2. Système de commentaires
3. Système follow/unfollow
4. Système de partage
5. Notifications push

---

## 🛠️ Technologies Utilisées

### Frontend
- Next.js 15.3.8
- React 18.3.1
- TypeScript 5
- Tailwind CSS 3.4.1
- shadcn/ui

### Backend
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Firebase Hosting

### AI & ML
- Google Genkit 1.20.0

### Outils de Développement
- ESLint
- TypeScript Compiler
- Turbopack

---

## 📚 Ressources Externes

### Documentation Officielle

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [TypeScript](https://www.typescriptlang.org/docs/)

### Tutoriels Recommandés

- [Next.js App Router](https://nextjs.org/docs/app)
- [Firebase avec Next.js](https://firebase.google.com/docs/web/setup)
- [Genkit AI](https://firebase.google.com/docs/genkit)

### Communauté

- [Discord NeyshaPlay](#) (à créer)
- [GitHub Issues](https://github.com/[repo]/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/nextjs)

---

## 🐛 Signaler un Bug

1. Vérifier que le bug n'est pas déjà dans "Problèmes Connus"
2. Créer une issue GitHub avec :
   - Description détaillée
   - Étapes pour reproduire
   - Comportement attendu vs actuel
   - Screenshots si applicable
   - Environnement (navigateur, OS)

---

## 💡 Proposer une Fonctionnalité

1. Vérifier que la fonctionnalité n'est pas déjà dans `FONCTIONNALITES_FUTURES.md`
2. Créer une issue GitHub avec le label "enhancement"
3. Utiliser le template de fonctionnalité
4. Expliquer le cas d'usage et la valeur ajoutée

---

## 📞 Contact

Pour toute question sur la documentation :
- Créer une issue GitHub avec le label "documentation"
- Contacter l'équipe de développement

---

## 📅 Historique des Versions

### v0.1.0 (Mars 2026)
- 🎉 Version initiale
- ✅ Fonctionnalités de base implémentées
- 📚 Documentation complète créée

---

**Dernière mise à jour** : Mars 2026  
**Mainteneur** : Équipe NeyshaPlay  
**Licence** : Privé
