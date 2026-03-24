import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "schema.prisma"),
  seed: {
    command: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
});
