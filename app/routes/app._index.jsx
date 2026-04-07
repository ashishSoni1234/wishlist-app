import { useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch analytics data directly in the loader
  try {
    // Fetch customers with wishlist metafields
    const response = await admin.graphql(
      `#graphql
        query getCustomersWithWishlist($first: Int!, $after: String) {
          customers(first: $first, after: $after, query: "metafield_namespace:wishlist") {
            edges {
              node {
                id
                displayName
                email
                metafield(namespace: "wishlist", key: "products") {
                  value
                  updatedAt
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `,
      { variables: { first: 50, after: null } }
    );
    const data = await response.json();
    const customers = data.data?.customers?.edges?.map((e) => e.node) || [];

    // Aggregate
    const productCounts = {};
    let totalItems = 0;
    const today = new Date().toISOString().split("T")[0];
    let todayCount = 0;

    for (const customer of customers) {
      let products = [];
      try {
        products = JSON.parse(customer.metafield?.value || "[]");
      } catch {
        products = [];
      }
      totalItems += products.length;
      if (customer.metafield?.updatedAt?.startsWith(today)) {
        todayCount++;
      }
      for (const gid of products) {
        productCounts[gid] = (productCounts[gid] || 0) + 1;
      }
    }

    // Get top 10 products
    const topEntries = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    let topProducts = [];
    if (topEntries.length > 0) {
      try {
        const productResponse = await admin.graphql(
          `#graphql
            query getProductsByIds($ids: [ID!]!) {
              nodes(ids: $ids) {
                ... on Product {
                  id
                  title
                  handle
                  status
                  featuredMedia {
                    preview {
                      image {
                        url(transform: { maxWidth: 80, maxHeight: 80 })
                        altText
                      }
                    }
                  }
                  priceRangeV2 {
                    minVariantPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          `,
          { variables: { ids: topEntries.map(([gid]) => gid) } }
        );
        const productData = await productResponse.json();
        const nodes = productData.data?.nodes || [];

        topProducts = topEntries.map(([gid, count]) => {
          const p = nodes.find((n) => n?.id === gid);
          return {
            id: gid,
            numericId: gid.split("/").pop(),
            title: p?.title || "Unknown Product",
            handle: p?.handle || "",
            imageUrl: p?.featuredMedia?.preview?.image?.url || null,
            price: p?.priceRangeV2?.minVariantPrice?.amount || "0.00",
            currency: p?.priceRangeV2?.minVariantPrice?.currencyCode || "USD",
            wishlistCount: count,
          };
        });
      } catch {
        topProducts = topEntries.map(([gid, count]) => ({
          id: gid,
          numericId: gid.split("/").pop(),
          title: "Unknown",
          wishlistCount: count,
        }));
      }
    }

    return {
      analytics: {
        totalCustomers: customers.length,
        totalItems,
        todayCount,
        topProducts,
      },
    };
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return {
      analytics: {
        totalCustomers: 0,
        totalItems: 0,
        todayCount: 0,
        topProducts: [],
      },
    };
  }
};

export default function WishlistDashboard() {
  const { analytics } = useLoaderData();
  const shopify = useAppBridge();

  return (
    <s-page heading="Wishlist Dashboard">
      <s-button
        slot="primary-action"
        onClick={() => window.location.reload()}
      >
        Refresh Data
      </s-button>

      {/* Summary Cards */}
      <s-section>
        <s-stack direction="inline" gap="base" wrap>
          {/* Total Users */}
          <s-box
            padding="large-200"
            borderWidth="base"
            borderRadius="large-100"
            background="subdued"
            style={{ flex: 1, minWidth: "200px" }}
          >
            <s-stack direction="block" gap="small">
              <s-text variant="bodyMd" color="subdued">
                👥 Users with Wishlists
              </s-text>
              <s-text variant="heading2xl">
                {analytics.totalCustomers}
              </s-text>
            </s-stack>
          </s-box>

          {/* Total Items */}
          <s-box
            padding="large-200"
            borderWidth="base"
            borderRadius="large-100"
            background="subdued"
            style={{ flex: 1, minWidth: "200px" }}
          >
            <s-stack direction="block" gap="small">
              <s-text variant="bodyMd" color="subdued">
                ♥ Total Wishlisted Items
              </s-text>
              <s-text variant="heading2xl">
                {analytics.totalItems}
              </s-text>
            </s-stack>
          </s-box>

          {/* Today */}
          <s-box
            padding="large-200"
            borderWidth="base"
            borderRadius="large-100"
            background="subdued"
            style={{ flex: 1, minWidth: "200px" }}
          >
            <s-stack direction="block" gap="small">
              <s-text variant="bodyMd" color="subdued">
                📊 Updated Today
              </s-text>
              <s-text variant="heading2xl">
                {analytics.todayCount}
              </s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      {/* Top Wishlisted Products */}
      <s-section heading="Most Wishlisted Products">
        {analytics.topProducts.length === 0 ? (
          <s-box padding="large-200">
            <s-stack direction="block" gap="base" align="center">
              <s-text variant="headingLg">No wishlist data yet</s-text>
              <s-text variant="bodyMd" color="subdued">
                Wishlist analytics will appear here once customers start adding
                products to their wishlists. Make sure the Wishlist Button theme
                extension is active on your store.
              </s-text>
            </s-stack>
          </s-box>
        ) : (
          <s-box>
            {/* Table Header */}
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
              style={{ marginBottom: "4px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr 100px 80px 80px",
                  gap: "12px",
                  alignItems: "center",
                  fontWeight: 600,
                }}
              >
                <span></span>
                <s-text variant="bodySm" fontWeight="semibold">Product</s-text>
                <s-text variant="bodySm" fontWeight="semibold">Price</s-text>
                <s-text variant="bodySm" fontWeight="semibold">Wishlists</s-text>
                <span></span>
              </div>
            </s-box>

            {/* Table Rows */}
            {analytics.topProducts.map((product) => (
              <s-box
                key={product.id}
                padding="base"
                borderWidth="base"
                borderRadius="base"
                style={{ marginBottom: "2px" }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr 100px 80px 80px",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  {/* Image */}
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#f1f1f1",
                    }}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 20,
                        }}
                      >
                        📦
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <s-text variant="bodyMd" fontWeight="semibold">
                    {product.title}
                  </s-text>

                  {/* Price */}
                  <s-text variant="bodyMd">
                    {product.currency === "USD" ? "$" : product.currency}{" "}
                    {parseFloat(product.price || 0).toFixed(2)}
                  </s-text>

                  {/* Wishlist Count — Badge */}
                  <div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "#fef3f2",
                        color: "#e63946",
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      ♥ {product.wishlistCount}
                    </span>
                  </div>

                  {/* View Button */}
                  <s-button
                    variant="tertiary"
                    size="slim"
                    onClick={() => {
                      shopify.intents?.invoke?.("edit:shopify/Product", {
                        value: product.id,
                      });
                    }}
                  >
                    View
                  </s-button>
                </div>
              </s-box>
            ))}
          </s-box>
        )}
      </s-section>

      {/* Setup Info */}
      <s-section slot="aside" heading="Wishlist Setup">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            <s-text fontWeight="semibold">Theme Extension: </s-text>
            <s-text>
              Make sure the Wishlist Button block is added to your product pages
              in the Theme Editor.
            </s-text>
          </s-paragraph>
          <s-paragraph>
            <s-text fontWeight="semibold">How it works: </s-text>
            <s-text>
              When customers click the heart button on a product page, the
              product is saved to their wishlist. Logged-in customers get their
              wishlist synced to their account via Shopify Metafields.
            </s-text>
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Quick Links">
        <s-unordered-list>
          <s-list-item>
            <s-link
              href="https://wishlist-dev-app-2.myshopify.com/admin/themes/current/editor"
              target="_blank"
            >
              Theme Editor
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
