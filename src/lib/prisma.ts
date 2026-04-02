import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Required for Supabase pooler connections — Prisma's driver adapter
// does its own TLS and rejects Supabase's certificate chain without this.
if (process.env.NODE_ENV === "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  const pool = new pg.Pool({
    connectionString,
    max: 5,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
