# Bot WhatsApp - Mitigarisk Twilio Dialogflow

Bot conversationnel WhatsApp utilisant Twilio et Google Dialogflow pour la gestion et le signalement d'événements. Le bot "Nelly" guide les utilisateurs à travers un processus structuré de création de tickets d'incidents.

## 📋 Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Technologies utilisées](#technologies-utilisées)

## ✨ Fonctionnalités

- **Intégration WhatsApp** via Twilio pour la communication avec les utilisateurs
- **Traitement du langage naturel** avec Google Dialogflow pour comprendre les intentions des utilisateurs
- **Workflow guidé** pour la création de tickets d'incidents :
  - Sélection du type d'événement
  - Choix de la catégorie
  - Sélection du niveau de gravité
  - Description du problème
  - Enregistrement du ticket via API
- **Gestion des erreurs** avec messages d'erreur conviviaux
- **Support multilingue** (français)

## 🔧 Prérequis

- Node.js (version 14 ou supérieure)
- npm ou yarn
- Compte Twilio avec accès WhatsApp
- Projet Google Cloud avec Dialogflow activé
- Accès à l'API backend Mitigarisk

## 📦 Installation

1. Clonez le repository :
```bash
git clone <url-du-repo>
cd mitigariskTwilioDialogflow
```

2. Installez les dépendances :
```bash
npm install
```

## ⚙️ Configuration

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```env
# Port du serveur
PORT=4000

# Credentials Twilio
TWILIO_ACCOUNT_SID=votre_account_sid
TWILIO_AUTH_TOKEN=votre_auth_token

# Google Cloud - Dialogflow
# Les credentials Google Cloud doivent être configurés via une variable d'environnement
# ou un fichier de credentials JSON (GOOGLE_APPLICATION_CREDENTIALS)
GOOGLE_APPLICATION_CREDENTIALS=chemin/vers/votre/credentials.json
```

### Configuration Google Cloud

1. Créez un projet dans [Google Cloud Console](https://console.cloud.google.com/)
2. Activez l'API Dialogflow
3. Créez un compte de service et téléchargez la clé JSON
4. Définissez la variable d'environnement `GOOGLE_APPLICATION_CREDENTIALS` pointant vers ce fichier

### Configuration Twilio

1. Créez un compte sur [Twilio](https://www.twilio.com/)
2. Configurez WhatsApp Sandbox ou utilisez un numéro WhatsApp Business approuvé
3. Configurez l'URL webhook : `https://votre-domaine.com/whatsapp`

## 🚀 Utilisation

### Démarrage du serveur

```bash
node index.js
```

Le serveur démarre sur le port spécifié dans la variable `PORT` (par défaut 4000).

### Workflow du bot

1. **Initialisation** : L'utilisateur envoie un message au bot
2. **Sélection du type** : Le bot présente les types d'événements disponibles
3. **Choix de la catégorie** : L'utilisateur sélectionne une catégorie
4. **Niveau de gravité** : L'utilisateur choisit le niveau de gravité
5. **Description** : L'utilisateur décrit le problème
6. **Création du ticket** : Le bot enregistre le ticket et confirme à l'utilisateur

## 🏗️ Architecture

```
┌─────────────┐
│   WhatsApp  │
│   (Twilio)  │
└──────┬──────┘
       │
       │ POST /whatsapp
       ▼
┌─────────────────┐
│   Express App    │
│   (index.js)     │
└──────┬───────────┘
       │
       ├──► Dialogflow (NLP)
       │
       └──► API Backend
            (botAPI)
```

## 📡 API Endpoints

### Endpoint principal

**POST** `/whatsapp`

Endpoint webhook appelé par Twilio lorsqu'un message WhatsApp est reçu.

**Body (form-urlencoded)** :
- `From` : Numéro WhatsApp de l'expéditeur
- `To` : Numéro WhatsApp du destinataire (bot)
- `Body` : Contenu du message

### API Backend utilisée

Le bot communique avec une API backend aux endpoints suivants :

- `GET ${botAPI}/types` - Récupère la liste des types d'événements
- `GET ${botAPI}/categories` - Récupère la liste des catégories
- `GET ${botAPI}/gravities` - Récupère la liste des niveaux de gravité
- `POST ${botAPI}/botTickets/` - Crée un nouveau ticket

**Configuration actuelle** : `http://51.38.57.172:8030/api`

## 🛠️ Technologies utilisées

- **Express.js** : Framework web pour Node.js
- **Twilio** : API de communication pour WhatsApp
- **Google Dialogflow** : Plateforme de traitement du langage naturel
- **Axios** : Client HTTP pour les appels API
- **dotenv** : Gestion des variables d'environnement

## 📝 Structure du projet

```
mitigariskTwilioDialogflow/
├── index.js              # Point d'entrée principal
├── package.json          # Dépendances et scripts
├── .env                  # Variables d'environnement (à créer)
└── README.md            # Documentation
```

## 🔍 Actions Dialogflow

Le bot gère les actions suivantes dans Dialogflow :

- `ask.solution` : Demande de sélection du type d'événement
- `category-choice` : Choix de la catégorie
- `gravity-choice` : Choix du niveau de gravité
- `select-injuries` : Demande de description du problème
- `all-right` : Finalisation et création du ticket
- `emi.due-date` : Action exemple (à adapter selon vos besoins)

## 🐛 Gestion des erreurs

Le bot gère les erreurs de manière gracieuse :
- Erreurs API : Message d'erreur envoyé à l'utilisateur
- Erreurs Dialogflow : Logs dans la console
- Erreurs Twilio : Logs dans la console

## 📝 Notes

- Le `projectId` Dialogflow est actuellement configuré sur `'nokia-whatsapp-odue'`
- Le bot utilise le code de langue `'fr-FR'` pour Dialogflow
- Les sessions Dialogflow sont créées par numéro de téléphone utilisateur

## 🔒 Sécurité

- Ne commitez jamais le fichier `.env`
- Gardez vos credentials Twilio et Google Cloud secrets
- Utilisez HTTPS en production
- Validez et sanitisez les entrées utilisateur

## 📄 Licence

ISC

## 👤 Auteur

Projet développé pour Mitigarisk

---

Pour toute question ou problème, veuillez ouvrir une issue sur le repository.

