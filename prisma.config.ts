import path from "node:path";
import { defineConfig } from "prisma/config";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  seed: {
    command: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
});
