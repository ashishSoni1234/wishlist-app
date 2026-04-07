import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function run() {
  const sessions = await prisma.session.findMany();
  console.log("SESSIONS IN DB:", sessions.length);
}
run();
