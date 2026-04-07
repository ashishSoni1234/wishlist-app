/**
 * App Proxy Route — /apps/wishlist/api/*
 */

import { authenticate } from "../shopify.server";

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
  mutation setCustomerWishlist($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id namespace key value }
      userErrors { field message }
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

function toProductGid(id) {
  if (!id) return null;
  const s = String(id);
  if (s.startsWith("gid://shopify/Product/")) return s;
  const num = s.replace(/\D/g, "");
  return num ? `gid://shopify/Product/${num}` : null;
}

function toCustomerGid(id) {
  if (!id) return null;
  const s = String(id);
  if (s.startsWith("gid://shopify/Customer/")) return s;
  const num = s.replace(/\D/g, "");
  return num ? `gid://shopify/Customer/${num}` : null;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

// ✅ FIX 3: Add/Remove individual product support + sync
export const action = async ({ request }) => {
  console.log(`[PROXY ACTION] Incoming POST request`);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const { admin } = await authenticate.public.appProxy(request);

    const url = new URL(request.url);
    const loggedInCustomerId = url.searchParams.get("logged_in_customer_id");

    if (!loggedInCustomerId) {
      return Response.json(
        { success: false, error: "Customer not logged in" },
        { status: 401, headers: corsHeaders() }
      );
    }

    const customerGid = toCustomerGid(loggedInCustomerId);
    if (!customerGid) {
      return Response.json(
        { success: false, error: "Invalid customer ID" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const body = await request.json();
    console.log(`[PROXY ACTION] Request body:`, body);
    const { productIds, productId, action: wishlistAction } = body;

    // Fetch existing wishlist pehle
    const currentRes = await admin.graphql(CUSTOMER_METAFIELD_QUERY, {
      variables: { customerId: customerGid },
    });
    const currentData = await currentRes.json();
    let existing = parseWishlist(
      currentData.data?.customer?.metafield?.value
    );

    let merged = existing;

    // ✅ Action ke hisaab se handle karo
    if (wishlistAction === "remove" && productId) {
      // Single product remove
      const gid = toProductGid(productId);
      merged = existing.filter((id) => id !== gid);
    } else if (wishlistAction === "add" && productId) {
      // Single product add
      const gid = toProductGid(productId);
      if (gid && !existing.includes(gid)) {
        merged = [...existing, gid];
      }
    } else if (wishlistAction === "replace" && Array.isArray(productIds)) {
      // Direct overwrite local se sync karne me race conditions rokne ke liye
      merged = productIds.map(toProductGid).filter(Boolean);
    } else if (Array.isArray(productIds)) {
      // Bulk sync — local items jo metafield mein nahi hain merge karo
      const newGids = productIds
        .map(toProductGid)
        .filter((gid) => gid && !existing.includes(gid));
      merged = [...existing, ...newGids];
    } else {
      return Response.json(
        { success: false, error: "productIds array ya productId required hai" },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Save to metafield
    const saveRes = await admin.graphql(SET_CUSTOMER_METAFIELD, {
      variables: {
        metafields: [
          {
            ownerId: customerGid,
            namespace: "wishlist",
            key: "products",
            type: "list.product_reference",
            value: JSON.stringify(merged),
          },
        ],
      },
    });
    const saveData = await saveRes.json();
    console.log(`[PROXY ACTION] Save operation response:`, saveData);
    const errors = saveData.data?.metafieldsSet?.userErrors;

    if (errors?.length > 0) {
      console.error("Metafield save errors:", errors);
      return Response.json(
        { success: false, error: errors[0].message },
        { status: 500, headers: corsHeaders() }
      );
    }

    return Response.json(
      { success: true, wishlist: merged, count: merged.length },
      { headers: corsHeaders() }
    );

  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Proxy sync error:", error);
    return Response.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500, headers: corsHeaders() }
    );
  }
};

// ✅ GET - Customer ki wishlist fetch karo
export const loader = async ({ request }) => {
  console.log(`[PROXY LOADER] Incoming GET request`);
  try {
    const { admin } = await authenticate.public.appProxy(request);

    const url = new URL(request.url);
    const loggedInCustomerId = url.searchParams.get("logged_in_customer_id");
    const customerId = url.searchParams.get("customerId") || loggedInCustomerId;

    if (!customerId) {
      return Response.json(
        { success: false, error: "Customer not logged in" },
        { status: 401, headers: corsHeaders() }
      );
    }

    const customerGid = toCustomerGid(customerId);
    if (!customerGid) {
      return Response.json(
        { success: false, error: "Invalid customer ID" },
        { status: 400, headers: corsHeaders() }
      );
    }

    const res = await admin.graphql(CUSTOMER_METAFIELD_QUERY, {
      variables: { customerId: customerGid },
    });
    const data = await res.json();
    const wishlist = parseWishlist(data.data?.customer?.metafield?.value);
    console.log(`[PROXY LOADER] Fetch returned items:`, wishlist.length);

    let richWishlist = [];
    if (wishlist.length > 0) {
      const nodesQuery = `
        query getProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on Product {
              id
              handle
            }
          }
        }
      `;
      const prodRes = await admin.graphql(nodesQuery, { variables: { ids: wishlist } });
      const prodData = await prodRes.json();
      if (prodData.data && prodData.data.nodes) {
        richWishlist = prodData.data.nodes.filter(Boolean).map((n) => ({
          id: String(n.id).replace('gid://shopify/Product/', ''),
          handle: n.handle,
        }));
      }
    }

    return Response.json(
      { success: true, wishlist: richWishlist, count: richWishlist.length },
      { headers: corsHeaders() }
    );

  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Proxy get error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
};