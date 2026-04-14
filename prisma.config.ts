import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // For schema push to Turso, set TURSO_DATABASE_URL. Otherwise uses local SQLite.
    url: process.env["TURSO_DATABASE_URL"] ?? process.env["DATABASE_URL"],
  },
});
