# 📚 Technical Documentation - Shopify Wishlist App

Welcome to the comprehensive technical documentation for the Shopify Wishlist App. This guide breaks down the core architecture, data persistence layers, API routes, and testing methodology to help developers understand, extend, and deploy the application.

---

## 1. Architecture Overview

This application acts as a bridge between the Shopify Merchant (Admin) and the Shopify Customer (Storefront) across two primary architecture surfaces:

1. **Embedded Admin App (React Router)**
   Serves the internal Merchant-facing dashboard. Includes robust analytics and wishlist visibility. Rendered using React Router v7 & Shopify Contexts.
2. **Theme App Extension (Liquid + JS)**
   Injects the `Wishlist Button` and `Wishlist Page` directly into the merchant's storefront efficiently, bypassing the need for manual liquid structure edits.

**General Data Flow:**
1. A guest customer toggles a wishlist item on the storefront.
2. The product reference is immediately saved in the browser's `localStorage` (optimistic UX).
3. If the user logs in, the active state seamlessly synchronizes with the backend via a fast **Shopify App Proxy**.
4. The backend persists the target wishlist collection to Shopify **Customer Metafields** (`wishlist.products`).
5. The Admin dashboard continually reads aggregate metafield and session data via the **Shopify GraphQL Admin API**.

---

## 2. Persistence Model

The app uses a dual-layer persistence strategy to support varied user contexts:

### A. Customer Metafield (Authoritative for Logged-In Users)
The canonical state for authenticated accounts relies directly on native Shopify Metafields.
- **Namespace**: `wishlist`
- **Key**: `products`
- **Type**: `list.product_reference`

**Data Shape (JSON GIDs Array):**
```json
[
  "gid://shopify/Product/848194918231",
  "gid://shopify/Product/918349201948"
]
```

### B. Local Storage (Guest + Optimistic UX)
Rapid interactions for unauthenticated users are housed locally.
- **Key**: `shopify_wishlist`

**Data Shape:**
```json
[
  { "id": "848194918231", "handle": "burton-snowboard-v2" },
  { "id": "918349201948", "handle": "anon-snow-goggles" }
]
```

---

## 3. API Contract (App Proxy)

All storefront-to-backend communication travels securely via Shopify's standard App Proxy path.

- **Base Proxy Path**: `/apps/wishlist/wishlist`

### `GET /apps/wishlist/wishlist`
Retrieves a fully hydrated wishlist dataset for the currently authenticated customer session.

**Example Response Payload:**
```json
{
  "success": true,
  "wishlist": [
    { "id": "848194918231", "handle": "premium-snowboard" }
  ],
  "count": 1
}
```

### `POST /apps/wishlist/wishlist`
Accepts updates to the active wishlist array using deterministic replacement actions.

**Example Request Payload:**
```json
{
  "productIds": ["848194918231", "918349201948"],
  "action": "replace"
}
```

**Supported Actions:**
- `replace`: Overwrites backend metafield list with incoming `productIds`.
- `add`: Appends an individual product ID.
- `remove`: Removes a specific product ID from the corresponding user's list.

---

## 4. Local Development Setup

Setting up the project locally requires executing specific setup cycles for DB creation mapping and installation:

1. **Install Dependencies**: `npm install`
2. **Environment Variable Configurations**:
   - Linux/macOS: `cp .env.example .env`
   - Windows PowerShell: `Copy-Item .env.example .env`
   - Set real credentials in your `.env` from your Shopify Partner Dashboard.
3. **Database Scaffolding**: `npm run setup`
4. **Booting Dev Host**: `npm run dev`

---

## 5. Test & Quality Gates

Ensure code quality aligns with repository standards. We strongly recommend testing before shipping.

- **Unit Tests**: `npm run test`
- **Linter**: `npm run lint`
- **E2E Automation Tests**: `npm run test:e2e`

*Publishing Recommendation:* Requires `npm run test` + `npm run lint` branches to successfully pass before merging or releasing any extensions.

---

## 6. Security & Secret Handling

- **DO NOT** hardcode Shopify secrets directly inside app routing or config files.
- Ensure `.env` and `.env.*` remain inside `.gitignore`.
- SQLite `db` files are also completely ignored to prevent environment leaking.
- Always retrieve Shopify Partner Dashboard values natively to specific isolated local files or deployment-safe variable injects.

---

## 7. Known Limitations

- The wishlisting mechanisms run purely at a **Product-level layer**, rather than a Variant-level component.
- Extraordinarily dense store accounts mapping over hundreds of wishlistings per user segment might need extra secondary caching limits for deep analytics queries.

---

## 8. Suggested Next Enhancements

- **Variant Migration**: Move code patterns from base product references support to detailed variant references mapped support.
- **Rate-Limiting Retry Patterns**: Insert smart request debouncing and rate-limit back-offs across synchronization mechanisms.
- **Dashboard Optimization**: Employ graph-paginating limits to scale app backend loading sizes on heavily aggregated stores.
