import { authenticate } from "../shopify.server";

/**
 * Wishlist Analytics API — Powers the admin dashboard
 *
 * Fetches all customers who have wishlist metafields,
 * aggregates product counts, and returns analytics data.
 */

const CUSTOMERS_WITH_WISHLIST_QUERY = `#graphql
  query getCustomersWithWishlist($first: Int!, $after: String) {
    customers(first: $first, after: $after, query: "metafield_namespace:wishlist") {
      edges {
        node {
          id
          displayName
          email
          createdAt
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
`;

const PRODUCTS_BY_IDS_QUERY = `#graphql
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
              url
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
`;

function parseWishlist(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    // Fetch all customers with wishlist metafields (paginated, up to 250)
    let allCustomers = [];
    let hasNextPage = true;
    let cursor = null;

    while (hasNextPage && allCustomers.length < 250) {
      const response = await admin.graphql(CUSTOMERS_WITH_WISHLIST_QUERY, {
        variables: { first: 50, after: cursor },
      });
      const data = await response.json();
      const customers = data.data?.customers;

      if (!customers) break;

      allCustomers = [
        ...allCustomers,
        ...customers.edges.map((e) => e.node),
      ];
      hasNextPage = customers.pageInfo.hasNextPage;
      cursor = customers.pageInfo.endCursor;
    }

    // Aggregate data
    const productCounts = {}; // productGid -> count
    let totalWishlistItems = 0;
    const today = new Date().toISOString().split("T")[0];
    let todayCount = 0;

    for (const customer of allCustomers) {
      const products = parseWishlist(customer.metafield?.value);
      totalWishlistItems += products.length;

      // Check if metafield was updated today
      if (customer.metafield?.updatedAt?.startsWith(today)) {
        todayCount++;
      }

      for (const productGid of products) {
        productCounts[productGid] = (productCounts[productGid] || 0) + 1;
      }
    }

    // Sort products by wishlist count (most popular first)
    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    // Fetch product details for top products
    let productDetails = [];
    if (topProducts.length > 0) {
      const productIds = topProducts.map(([gid]) => gid);
      try {
        const productResponse = await admin.graphql(PRODUCTS_BY_IDS_QUERY, {
          variables: { ids: productIds },
        });
        const productData = await productResponse.json();
        const nodes = productData.data?.nodes || [];

        productDetails = topProducts.map(([gid, count]) => {
          const product = nodes.find((n) => n?.id === gid);
          return {
            id: gid,
            title: product?.title || "Unknown Product",
            handle: product?.handle || "",
            status: product?.status || "UNKNOWN",
            imageUrl:
              product?.featuredMedia?.preview?.image?.url || null,
            imageAlt:
              product?.featuredMedia?.preview?.image?.altText || "",
            price:
              product?.priceRangeV2?.minVariantPrice?.amount || "0",
            currency:
              product?.priceRangeV2?.minVariantPrice?.currencyCode || "USD",
            wishlistCount: count,
          };
        });
      } catch (err) {
        console.error("Error fetching product details:", err);
        // Fallback: return IDs with counts
        productDetails = topProducts.map(([gid, count]) => ({
          id: gid,
          title: "Unknown Product",
          wishlistCount: count,
        }));
      }
    }

    return Response.json({
      success: true,
      analytics: {
        totalCustomersWithWishlists: allCustomers.length,
        totalWishlistItems,
        wishlistsUpdatedToday: todayCount,
        topProducts: productDetails,
      },
    });
  } catch (error) {
    console.error("Wishlist analytics error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
};
