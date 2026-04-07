import { authenticate } from "../shopify.server";

/**
 * Wishlist API — Manages customer wishlists via Shopify Customer Metafields
 *
 * Metafield structure:
 *   namespace: "wishlist"
 *   key: "products"
 *   type: "list.product_reference"
 *
 * Supported actions (via POST body "action" field):
 *   - "add"    → Add a product GID to wishlist
 *   - "remove" → Remove a product GID from wishlist
 *   - "get"    → Get all wishlisted product GIDs for a customer
 *   - "sync"   → Bulk sync from localStorage (merge with existing)
 */

// GraphQL fragments
const CUSTOMER_METAFIELD_QUERY = `#graphql
  query getCustomerWishlist($customerId: ID!) {
    customer(id: $customerId) {
      id
      metafield(namespace: "wishlist", key: "products") {
        id
        value
      }
    }
  }
`;

const SET_CUSTOMER_METAFIELD = `#graphql
  mutation setCustomerWishlist($customerId: ID!, $metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Helper: Parse metafield value to array of GIDs
function parseWishlist(metafieldValue) {
  if (!metafieldValue) return [];
  try {
    const parsed = JSON.parse(metafieldValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Helper: Ensure product ID is a valid GID
function toProductGid(id) {
  if (!id) return null;
  const idStr = String(id);
  if (idStr.startsWith("gid://shopify/Product/")) return idStr;
  // Strip non-numeric
  const numericId = idStr.replace(/\D/g, "");
  if (!numericId) return null;
  return `gid://shopify/Product/${numericId}`;
}

// Helper: Ensure customer ID is a valid GID
function toCustomerGid(id) {
  if (!id) return null;
  const idStr = String(id);
  if (idStr.startsWith("gid://shopify/Customer/")) return idStr;
  const numericId = idStr.replace(/\D/g, "");
  if (!numericId) return null;
  return `gid://shopify/Customer/${numericId}`;
}

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  try {
    const body = await request.json();
    const { action: wishlistAction, customerId, productId, productIds } = body;

    if (!customerId) {
      return Response.json(
        { success: false, error: "customerId is required" },
        { status: 400 }
      );
    }

    const customerGid = toCustomerGid(customerId);
    if (!customerGid) {
      return Response.json(
        { success: false, error: "Invalid customerId format" },
        { status: 400 }
      );
    }

    // Fetch current wishlist
    const currentResponse = await admin.graphql(CUSTOMER_METAFIELD_QUERY, {
      variables: { customerId: customerGid },
    });
    const currentData = await currentResponse.json();
    const customer = currentData.data?.customer;

    if (!customer) {
      return Response.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    let wishlist = parseWishlist(customer.metafield?.value);

    switch (wishlistAction) {
      case "get": {
        return Response.json({
          success: true,
          wishlist,
          count: wishlist.length,
        });
      }

      case "add": {
        const gid = toProductGid(productId);
        if (!gid) {
          return Response.json(
            { success: false, error: "Invalid productId" },
            { status: 400 }
          );
        }
        if (!wishlist.includes(gid)) {
          wishlist.push(gid);
        }
        break;
      }

      case "remove": {
        const gid = toProductGid(productId);
        if (!gid) {
          return Response.json(
            { success: false, error: "Invalid productId" },
            { status: 400 }
          );
        }
        wishlist = wishlist.filter((id) => id !== gid);
        break;
      }

      case "sync": {
        // Merge localStorage product IDs with existing metafield
        if (!Array.isArray(productIds)) {
          return Response.json(
            { success: false, error: "productIds must be an array" },
            { status: 400 }
          );
        }
        const newGids = productIds
          .map(toProductGid)
          .filter((gid) => gid && !wishlist.includes(gid));
        wishlist = [...wishlist, ...newGids];
        break;
      }

      default:
        return Response.json(
          {
            success: false,
            error: `Unknown action: ${wishlistAction}. Use: add, remove, get, sync`,
          },
          { status: 400 }
        );
    }

    // Save updated wishlist to metafield (skip for "get")
    if (wishlistAction !== "get") {
      const saveResponse = await admin.graphql(SET_CUSTOMER_METAFIELD, {
        variables: {
          customerId: customerGid,
          metafields: [
            {
              ownerId: customerGid,
              namespace: "wishlist",
              key: "products",
              type: "list.product_reference",
              value: JSON.stringify(wishlist),
            },
          ],
        },
      });
      const saveData = await saveResponse.json();
      const errors = saveData.data?.metafieldsSet?.userErrors;

      if (errors?.length > 0) {
        console.error("Wishlist metafield save errors:", errors);
        return Response.json(
          { success: false, error: errors[0].message, details: errors },
          { status: 500 }
        );
      }
    }

    return Response.json({
      success: true,
      action: wishlistAction,
      wishlist,
      count: wishlist.length,
    });
  } catch (error) {
    console.error("Wishlist API error:", error);
    return Response.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
};

// Also handle GET requests for convenience
export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const customerId = url.searchParams.get("customerId");

  if (!customerId) {
    return Response.json(
      { success: false, error: "customerId query param is required" },
      { status: 400 }
    );
  }

  const customerGid = toCustomerGid(customerId);
  if (!customerGid) {
    return Response.json(
      { success: false, error: "Invalid customerId format" },
      { status: 400 }
    );
  }

  try {
    const response = await admin.graphql(CUSTOMER_METAFIELD_QUERY, {
      variables: { customerId: customerGid },
    });
    const data = await response.json();
    const wishlist = parseWishlist(data.data?.customer?.metafield?.value);

    return Response.json({
      success: true,
      wishlist,
      count: wishlist.length,
    });
  } catch (error) {
    console.error("Wishlist GET error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
};
