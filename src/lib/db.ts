import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada. Defina a conexão PostgreSQL do Supabase.");
  }

  const adapter = new PrismaPg({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
