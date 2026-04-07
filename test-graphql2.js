import { PrismaClient } from "@prisma/client";
import { shopifyApi, ApiVersion, Session } from "@shopify/shopify-api";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-07";

const prisma = new PrismaClient();

async function run() {
  const sessionData = await prisma.session.findFirst({
    where: { shop: "wishlist-dev-app-2.myshopify.com" }
  });
  
  if (!sessionData) return console.log("No session found");

  const shopify = shopifyApi({
    apiKey: "dummy",
    apiSecretKey: "dummy",
    apiVersion: ApiVersion.July24,
    isCustomStoreApp: false,
    scopes: ["read_customers", "write_customers"],
    isEmbeddedApp: true,
    hostName: "example.com",
    restResources,
  });

  const session = new Session(sessionData);
  const client = new shopify.clients.Graphql({ session });

  try {
    const res = await client.request(`
      query {
        customer(id: "gid://shopify/Customer/99024929081") {
          id
          metafield(namespace: "wishlist", key: "products") {
            value
          }
        }
      }
    `);
    console.log("SUCCESS FETCH:", JSON.stringify(res.data, null, 2));

    const setRes = await client.request(`
      mutation {
        metafieldsSet(metafields: [
          {
            ownerId: "gid://shopify/Customer/99024929081",
            namespace: "wishlist",
            key: "products",
            type: "list.product_reference",
            value: "[\\"gid://shopify/Product/9837943554361\\"]"
          }
        ]) {
          metafields { id value }
          userErrors { field message }
        }
      }
    `);
    console.log("SUCCESS SAVE:", JSON.stringify(setRes.data, null, 2));

  } catch(e) {
    if (e.response) {
      console.log("ERROR:", JSON.stringify(e.response, null, 2));
    } else {
      console.log("ERROR:", e);
    }
  }
}

run();
