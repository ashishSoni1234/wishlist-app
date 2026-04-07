import { PrismaClient } from "@prisma/client";
import { shopifyApi, ApiVersion, Session } from "@shopify/shopify-api";

const prisma = new PrismaClient();

async function run() {
  const sessionData = await prisma.session.findFirst({
    where: { shop: "wishlist-dev-app-2.myshopify.com" }
  });
  
  if (!sessionData) {
    console.log("No session found");
    return;
  }

  const shopify = shopifyApi({
    apiKey: "dummy",
    apiSecretKey: "dummy",
    apiVersion: ApiVersion.July24,
    isCustomStoreApp: false,
    adminApiAccessToken: sessionData.accessToken,
    isEmbeddedApp: true,
    hostName: "example.com"
  });

  const session = new Session(sessionData);
  const client = new shopify.clients.Graphql({ session });

  try {
    const res = await client.request(`
      query {
        customer(id: "gid://shopify/Customer/99024929081") {
          id
        }
      }
    `);
    console.log("SUCCESS:", res.data);
  } catch(e) {
    console.log("ERROR:", e);
  }
}

run();
