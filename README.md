# Shopify Wishlist App

Production-ready Shopify wishlist app built with React Router v7 and Shopify Theme App Extension.

## What It Does

- Adds a wishlist button on product pages via Theme App Extension.
- Maintains wishlist for guests using localStorage.
- Syncs logged-in customer wishlist to Shopify Customer Metafields.
- Provides admin analytics in embedded app UI.
- Exposes App Proxy endpoints for storefront interactions.

## Tech Stack

- React Router v7
- Node.js
- Shopify CLI + App Bridge
- Prisma + SQLite (session storage)
- Vitest + Playwright

## Prerequisites

- Node.js >=20.19 <22 or >=22.12
- npm
- Shopify CLI
- Shopify Partner account + development store

## Quick Start (Any Machine)

### 1) Clone repository

```bash
git clone https://github.com/ashishSoni1234/wishlist-app.git
cd wishlist-app
```

### 2) Install dependencies

```bash
npm install
```

### 3) Create environment file

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit .env and fill actual values from Shopify Partner Dashboard.

### 4) Setup local database

```bash
npm run setup
```

### 5) Start dev server

```bash
npm run dev
```

Shopify CLI will prompt to connect the app to a development store.

## Theme Extension Setup

1. Open your dev store Theme Editor.
2. Add Wishlist Button app block to product template.
3. Create a page for wishlist and add Wishlist Page block/section.
4. Save and preview storefront.

## Environment Variables

Use .env.example as reference.

- SHOPIFY_API_KEY
- SHOPIFY_API_SECRET
- SHOPIFY_APP_URL
- DATABASE_URL
- NODE_ENV

## Scripts

- npm run dev - Start Shopify app dev server
- npm run build - Build app
- npm run start - Serve production build
- npm run setup - Prisma generate + migrate deploy
- npm run lint - Run ESLint
- npm run test - Run unit tests
- npm run test:e2e - Run Playwright E2E tests
- npm run deploy - Deploy app using Shopify CLI

## API Endpoints

Via app proxy:

- GET /apps/wishlist/wishlist
- POST /apps/wishlist/wishlist

## Security Notes

- Never commit .env or any secrets.
- This repository ignores .env, .env.*, sqlite db files, and build artifacts.
- Rotate credentials immediately if they are ever exposed.

## Testing Status

Current local verification before publish:

- npm run test: passing
- npm run lint: passing

## License

MIT
