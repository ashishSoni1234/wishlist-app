# 🛍️ Shopify Wishlist App

> A production-ready, highly conversion-optimized Shopify Wishlist application built with React Router v7, Shopify Theme App Extension, and Prisma.

[![React Router](https://img.shields.io/badge/React_Router-v7-CA4245?style=for-the-badge&logo=react-router&logoColor=white)](https://reactrouter.com/)
[![Shopify](https://img.shields.io/badge/Shopify-CLI-95BF47?style=for-the-badge&logo=shopify&logoColor=white)](https://shopify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)

---

## 🎥 Demo Video

Check out the full demonstration of the Wishlist App in action here:

[![Watch the Demo](https://img.shields.io/badge/YouTube-Watch_Demo-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/vl9iSaSz0-w)

*(Alternatively, click [this link](https://youtu.be/vl9iSaSz0-w) to watch the demo directly on YouTube)*

---

## 📑 Full Documentation

For a detailed technical deep-dive into the architecture, persistence model, API contracts, and testing procedures, please see our complete documentation:

👉 **[Read the Full Documentation (DOCUMENTATION.md)](./DOCUMENTATION.md)**

---

## ✨ Key Features

- **Storefront Theme Extension**: Easily customizable "Add to Wishlist" buttons directly on product detail pages via Theme App Extensions without editing liquid files.
- **Guest & Logged-In Support**: 
  - *Guests*: Wishlist is reliably stored in persistent browser `localStorage`.
  - *Logged-In Customers*: Seamless synchronization with Shopify Customer Metafields for cross-device access.
- **Admin Dashboard & Analytics**: Embedded Shopify Admin app providing merchants with comprehensive analytics on most wishlisted products.
- **App Proxy Endpoints**: Secure, fast, and scalable interactions between the storefront and backend database.
- **Robust Tech Stack**: Powered by modern standards leveraging React Router v7 and generic session storage via Prisma (SQLite configured for dev).

---

## 🛠️ Tech Stack & Technologies

- **Framework**: React Router v7, Node.js
- **Shopify Integrations**: Shopify CLI, App Bridge React, App Proxy, Theme App Extensions
- **Database & ORM**: Prisma ORM, SQLite (Switchable to Postgres/MySQL for Prod)
- **Testing**: Vitest (Unit Testing) and Playwright (E2E Testing)
- **UI**: Shopify Polaris for the Embedded Admin app

---

## 🚀 Quick Start Guide

### 1) Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/en) `>=20.19 <22` or `>=22.12`
- `npm` package manager
- A [Shopify Partner account](https://partners.shopify.com/) and a development store.

### 2) Clone & Install

```bash
git clone https://github.com/ashishSoni1234/wishlist-app.git
cd wishlist-app
npm install
```

### 3) Environment Variables Setup

Copy the example environment file:
- **Linux/macOS**: `cp .env.example .env`
- **Windows PowerShell**: `Copy-Item .env.example .env`

Then, edit `.env` and fill in your actual values from the Shopify Partner Dashboard.

### 4) Database & Startup

Run Prisma setups and boot the dev server:

```bash
npm run setup
npm run dev
```

*The Shopify CLI will prompt you to link/create an app and authenticate with your development store.*

---

## 📝 Scripts Summary

| Command | Action |
| --- | --- |
| `npm run dev` | Starts the local Shopify app dev server |
| `npm run build` | Builds the React Router application for production |
| `npm run start` | Serves the production build |
| `npm run setup` | Performs Prisma schema generation and DB migrations |
| `npm run test` | Validates local unit tests using `vitest` |
| `npm run test:e2e`| Runs heavy E2E workflows using Playwright |
| `npm run lint` | Analyzes code ensuring ES-lint code quality |
| `npm run deploy`| Deploys standard extensions & configuration via Shopify CLI |

---

## 🔒 Security Notes

- **Never commit `.env` or any secrets.**
- This repository correctly ignores `.env`, `.env.*`, `.sqlite` database files, and build artifacts via `.gitignore`.
- Always rotate your credentials immediately if they are ever exposed.

## ✅ Testing Status

Current local verification status before publication:

- `npm run test`: Passing
- `npm run lint`: Passing

---

## 📄 License

Distributed under the MIT License.
