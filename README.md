# TeamOS — Gestion d'équipe intelligente

Plateforme SaaS tout-en-un pour gérer projets, tâches, planning, suivi du temps et congés. Inspiré de Jira, Asana et Float.

## Stack technique

- **Next.js 14** (App Router, Server Components)
- **Drizzle ORM** + **PostgreSQL**
- **NextAuth v5** (JWT, Credentials + Google OAuth)
- **Tailwind CSS v4** + shadcn/ui
- **@dnd-kit** (drag-and-drop Kanban)
- **react-hook-form** + **zod**

## Démarrage rapide

### 1. Prérequis

- Node.js 20+
- PostgreSQL 15+

### 2. Installation

```bash
npm install
```

### 3. Configuration

Copier et remplir les variables d'environnement :

```bash
cp .env.local .env.local
```

Variables requises :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/teamos"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre-secret-aleatoire-long"
GOOGLE_CLIENT_ID=""        # optionnel, pour Google OAuth
GOOGLE_CLIENT_SECRET=""    # optionnel, pour Google OAuth
```

### 4. Base de données

```bash
# Créer la base
createdb teamos

# Appliquer les migrations
npx drizzle-kit migrate

# (Optionnel) Injecter des données de démo
npx tsx scripts/seed.ts
```

### 5. Lancer le serveur

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

**Identifiants démo :** `demo@teamos.app` / `demo1234`

---

## Architecture

```
teamos/
├── app/
│   ├── (auth)/          # Login, register, onboarding
│   ├── (app)/           # Application principale (layout avec sidebar)
│   │   ├── dashboard/   # Vue d'ensemble
│   │   ├── my-work/     # Mes tâches
│   │   ├── projects/    # Projets + vue détail
│   │   ├── tasks/       # Toutes les tâches
│   │   ├── teams/       # Membres de l'équipe
│   │   ├── planning/    # Charge de travail hebdomadaire
│   │   ├── time/        # Suivi du temps
│   │   ├── leave/       # Congés et absences
│   │   ├── settings/    # Paramètres profil/org/planning
│   │   └── notifications/
│   └── api/             # Routes API REST
├── components/          # Composants React
├── lib/
│   ├── auth/            # NextAuth config
│   ├── db/              # Drizzle schema + connexion
│   └── api/             # Middleware withAuth
├── drizzle/             # Migrations SQL générées
└── scripts/
    ├── migrate.ts       # Exécuter les migrations
    └── seed.ts          # Données de démo
```

## Fonctionnalités

| Module | Fonctionnalités |
|--------|-----------------|
| **Dashboard** | KPIs temps réel, tâches en retard, activité récente |
| **Projets** | CRUD projets, barre de progression, vue par projet |
| **Tâches** | Vue Kanban (drag-and-drop) + liste, filtres, priorités |
| **Mon travail** | Tâches assignées à l'utilisateur connecté |
| **Planning** | Charge hebdomadaire par membre, détection surcharge |
| **Temps** | Timer live, saisie manuelle, groupé par jour |
| **Congés** | Demandes, approbation manager, types de congés |
| **Équipes** | Membres, rôles, invitation par email |
| **Paramètres** | Profil, infos organisation, planning horaire |
| **Notifications** | Centre de notifications, marquer comme lu |

## Multi-tenancy

Chaque requête est scopée par `organizationId`. Le middleware `withAuth` (dans `lib/api/middleware.ts`) :
1. Vérifie la session NextAuth
2. Lit l'header `x-organization-id`
3. Vérifie l'appartenance de l'utilisateur à l'organisation
4. Passe un contexte `{ userId, organizationId, membershipId, roleId }` au handler

## Scripts disponibles

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npx drizzle-kit generate   # Générer les migrations depuis le schema
npx drizzle-kit migrate    # Appliquer les migrations
npx drizzle-kit studio     # Interface Drizzle Studio (admin DB)
npx tsx scripts/seed.ts    # Données de démo
```
