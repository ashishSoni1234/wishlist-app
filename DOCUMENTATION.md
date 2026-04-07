# Technical Documentation - Shopify Wishlist App

## 1. Architecture Overview

The app has two main surfaces:

- Embedded Admin App (React Router): analytics and app management.
- Theme App Extension (Liquid + JS): storefront wishlist interactions.

Data flow:

1. Guest customer toggles wishlist on storefront.
2. Item list is stored in browser localStorage.
3. On logged-in context, storefront syncs through App Proxy.
4. Backend persists wishlist to Shopify Customer Metafield (wishlist.products).
5. Admin dashboard reads aggregated data with Shopify GraphQL Admin API.

## 2. Persistence Model

### Customer Metafield (authoritative for logged-in users)

- Namespace: wishlist
- Key: products
- Type: list.product_reference

Stored value resolves to product GIDs, for example:

```json
[
  "gid://shopify/Product/848194918231",
  "gid://shopify/Product/918349201948"
]
```

### Local Storage (guest + optimistic UX)

- Key: shopify_wishlist
- Value shape:

```json
[
  { "id": "848194918231", "handle": "burton-snowboard-v2" },
  { "id": "918349201948", "handle": "anon-snow-goggles" }
]
```

## 3. API Contract (App Proxy)

Base path: /apps/wishlist/wishlist

### GET /apps/wishlist/wishlist

Returns hydrated wishlist for current customer.

Example response:

```json
{
  "success": true,
  "wishlist": [
    { "id": "848194918231", "handle": "premium-snowboard" }
  ],
  "count": 1
}
```

### POST /apps/wishlist/wishlist

Supports deterministic sync operations.

Request body:

```json
{
  "productIds": ["848194918231", "918349201948"],
  "action": "replace"
}
```

Supported actions:

- replace
- add
- remove

## 4. Local Development Setup

1. Install dependencies: npm install
2. Copy env file:
   - Linux/macOS: cp .env.example .env
   - Windows PowerShell: Copy-Item .env.example .env
3. Set real credentials in .env
4. Run database setup: npm run setup
5. Start app: npm run dev

## 5. Test & Quality Gates

- Unit tests: npm run test
- Lint: npm run lint
- E2E tests: npm run test:e2e

Publishing recommendation:

- Require test + lint to pass before merging/releasing.

## 6. Security & Secret Handling

- .env and .env.* are ignored by git.
- SQLite db files are ignored.
- Do not hardcode secrets in app files.
- Use Shopify Partner Dashboard values only in local .env or deployment secret manager.

## 7. Known Limitations

- Wishlist is product-level, not variant-level.
- Very large stores may need further caching for analytics views.

## 8. Suggested Next Enhancements

- Move from product reference to variant reference support.
- Add rate-limit aware retry/backoff in sync endpoint.
- Add pagination and caching for analytics dashboards in high-volume stores.
