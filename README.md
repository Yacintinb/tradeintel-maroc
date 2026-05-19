# TradeIntel Maroc

Plateforme SaaS B2B d'intelligence import/export pour le Maroc. Le MVP transforme des fichiers publics CSV/XLSX, des metadonnees CKAN et des donnees ouvertes en dashboards, scores d'opportunite et rapports PDF/Excel.

## Objectif business

TradeIntel Maroc aide les importateurs, distributeurs, industriels, fournisseurs et consultants a identifier:

- les produits a importer ou eviter;
- les codes SH en croissance;
- les pays fournisseurs les plus pertinents;
- les secteurs avec potentiel;
- les scores d'opportunite et recommandations commerciales;
- les rapports premium pour clients B2B.

## Strategie Open Data & Open Protocols

Le MVP monetise les donnees ouvertes et les protocoles ouverts:

- import manuel robuste de fichiers Office des Changes, ADIL/Douane, HCP;
- connecteur CKAN generique pour Data.gov.ma;
- connecteur REST optionnel Bank Al-Maghrib;
- aucun scraping risque ni base payante comme fondation.

## Sources prevues

- Office des Changes Maroc: flux import/export via CSV/XLSX manuel.
- Data.gov.ma: CKAN API, recherche et stockage de metadonnees.
- Bank Al-Maghrib: taux de change via API si configuree, sinon import manuel.
- ADIL / Douane: tarifs, TVA et nomenclature via import manuel.
- HCP: indicateurs macro via import manuel.

## Installation locale

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

L'application sera disponible sur `http://localhost:3000`.

Comptes seed:

- Admin: `admin@tradeintel.ma` / `admin123`
- Client: `client@tradeintel.ma` / `client123`

## Variables d'environnement

Copier `.env.example` vers `.env` puis ajuster:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tradeintel_maroc?schema=public"
NEXTAUTH_SECRET="change-me-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
CKAN_ENDPOINT="https://data.gov.ma/api/3/action"
BAM_API_URL=""
BAM_API_KEY=""
DEFAULT_CURRENCY="MAD"
```

## Migration Prisma

Le schema est dans `prisma/schema.prisma`.

```bash
npx prisma generate
npx prisma migrate dev
```

Une migration initiale SQL est presente dans `prisma/migrations/20260519000000_init/migration.sql`.

## Seed

```bash
npx prisma db seed
```

Le seed cree 12 produits demo, des flux fictifs 2020-2025, 8 pays, tarifs douaniers, taux de change, indicateurs macro, scores calcules et un rapport sectoriel.

## Structure du projet

```text
app/                         Pages App Router et API routes
components/                  UI B2B reutilisable
lib/auth/                    Configuration NextAuth
lib/connectors/              CKAN, BAM, imports manuels, customs, HCP
lib/normalization/           Nettoyage codes SH et nombres
lib/reports/                 PDF et exports Excel
lib/scoring/                 Morocco Import Opportunity Score
lib/services/                Agregations dashboard
prisma/                      Schema, migration, seed
types/                       Extensions NextAuth
```

## Import Office des Changes

Page: `/admin/imports`

Etapes supportees par l'API:

1. upload CSV/XLSX;
2. detection type;
3. lecture premieres lignes;
4. mapping automatique par alias;
5. mapping manuel possible via payload API;
6. validation Zod;
7. nettoyage montants et quantites;
8. normalisation codes SH;
9. insertion `TradeFlow`;
10. creation `DataIngestionJob`;
11. stockage erreurs detaillees.

Alias reconnus: `Année`, `Mois`, `Flux`, `Import/Export`, `Code SH`, `Position tarifaire`, `Désignation`, `Produit`, `Pays`, `Valeur MAD`, `Montant`, `Quantité`, `Unité`.

## Configuration CKAN

Definir `CKAN_ENDPOINT`, par defaut:

```env
CKAN_ENDPOINT="https://data.gov.ma/api/3/action"
```

Routes:

- `GET /api/admin/open-datasets/search?q=commerce`
- `POST /api/admin/open-datasets/save`

Fonctions: `packageSearch`, `packageShow`, `normalizeDatasetMetadata`, `saveOpenDataset`.

## Configuration Bank Al-Maghrib

Definir si une API est disponible:

```env
BAM_API_URL="..."
BAM_API_KEY="..."
```

Si absent, `/api/admin/exchange-rates/sync` retourne un message de fallback et l'import manuel CSV/XLSX reste disponible.

## Recalcul des scores

Page: `/admin/scores`

Route:

```bash
POST /api/admin/scores/recalculate
```

Le score final est sur 100:

- market size 20%;
- growth 25%;
- stability 15%;
- supplier diversity 10%;
- margin 10%;
- regulatory 5%;
- customs 5%;
- FX 5%;
- data quality 5%.

Seuils:

- 80-100: Tres interessant
- 65-79: Interessant
- 50-64: A surveiller
- 35-49: Faible potentiel
- 0-34: Risque

## Synchronisation automatique

Le projet contient une tache Vercel Cron quotidienne:

```json
{
  "path": "/api/cron/sync",
  "schedule": "0 3 * * *"
}
```

Elle execute:

- import automatique des `DataSource` actives de type `CSV` ou `XLSX` avec une URL;
- remplacement des anciennes lignes de la meme source pour eviter les doublons;
- recherche CKAN selon `CKAN_AUTO_QUERIES`;
- synchronisation Bank Al-Maghrib si `BAM_API_URL` et `BAM_API_KEY` sont configures;
- recalcul des scores de l'annee courante.

Variables:

```env
CRON_SECRET="secret-optionnel"
CKAN_AUTO_QUERIES="commerce exterieur,douane,import export"
GITHUB_ACTIONS_TOKEN="github_pat_avec_permission_actions_write"
GITHUB_REPO_OWNER="Yacintinb"
GITHUB_REPO_NAME="tradeintel-maroc"
GITHUB_OFFICE_CHANGES_WORKFLOW="office-des-changes-scraper.yml"
GITHUB_WORKFLOW_REF="main"
```

Declenchement manuel:

```http
POST /api/admin/data-sources/sync
```

Declenchement cron securise si `CRON_SECRET` est defini:

```http
GET /api/cron/sync
Authorization: Bearer <CRON_SECRET>
```

## Scraping controle Office des Changes

Le scraping navigateur est isole dans un worker Playwright, recommande en GitHub Actions plutot que dans Vercel Serverless.

Script:

```bash
npm run scrape:office
```

Variables:

```env
APP_URL="https://tradeintel-maroc.vercel.app"
INGEST_SECRET="secret-identique-dans-vercel-et-github"
OFFICE_CHANGES_YEARS="2025"
OFFICE_CHANGES_URL="https://services.oc.gov.ma/DataBase/CommerceExterieur/requete.htm"
```

Endpoint recepteur securise:

```http
POST /api/ingest/trade-flows
Authorization: Bearer <INGEST_SECRET>
multipart/form-data file=<csv>
```

Workflow GitHub Actions:

```text
.github/workflows/office-des-changes-scraper.yml
```

Secrets GitHub a configurer:

- `APP_URL`
- `INGEST_SECRET`

Secret Vercel a configurer:

- `INGEST_SECRET`
- `GITHUB_ACTIONS_TOKEN` pour le bouton admin `Synchroniser Office des Changes`

Le worker ouvre le portail public Office des Changes, tente de generer un export tabulaire CSV, puis l'envoie a l'API d'ingestion. Si le portail change de structure, le job echoue avec logs plutot que d'importer des donnees douteuses.

Depuis `/admin/imports`, un administrateur peut:

- lancer le workflow GitHub Actions Office des Changes avec une ou plusieurs annees;
- supprimer les jobs d'import `FAILED`;
- supprimer les lignes Office des Changes dupliquees apres plusieurs relances;
- beneficier du recalcul automatique des scores apres chaque import reussi.

## Fonctionnalites MVP

- Auth email/mot de passe avec roles Admin/Client/Viewer.
- Sidebar B2B, dashboard KPI, graphiques Recharts.
- Recherche produits et fiche produit par code SH.
- Classement opportunites par score.
- Imports CSV/XLSX robustes avec validation.
- Gestion sources de donnees.
- Connecteur CKAN Data.gov.ma.
- Imports tarifs douaniers, taux de change, indicateurs macro.
- Generation PDF produit/secteur.
- Exports Excel TradeFlow, opportunites, sources.
- Seed demo complet.

## Roadmap

V1:

- import CSV/XLSX;
- dashboard;
- scoring;
- rapports PDF/Excel;
- CKAN metadata;
- tarifs douaniers manuels;
- taux de change.

V2:

- alertes email;
- abonnements payants;
- API client;
- dashboard sectoriel;
- meilleure visualisation;
- automatisation partielle des sources.

V3:

- market entry reports;
- matching fournisseurs/distributeurs;
- veille reglementaire;
- analyse de prix internationaux;
- integration CRM.

## Limites actuelles

- Les imports sont fonctionnels cote API; l'interface de mapping manuel peut etre enrichie avec un assistant visuel complet.
- Bank Al-Maghrib depend d'un endpoint/API reel configure.
- Les rapports PDF sont generes en version MVP textuelle; une mise en page premium avec graphiques integres peut suivre.
- Les abonnements sont modelises et seedes, mais le paiement n'est pas encore connecte.
