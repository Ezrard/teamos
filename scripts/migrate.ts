/**
 * Database migration script for TeamOS.
 * Run with: npx tsx scripts/migrate.ts
 *
 * This creates all tables from the Drizzle schema using raw SQL.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../lib/db/schema";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import "dotenv/config";

async function main() {
  const queryClient = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(queryClient, { schema });

  console.log("🚀 Running database migrations...");

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("✅ Migrations complete");
  } catch (err) {
    console.error("Migration error:", err);
    console.log("\n💡 If migrations folder doesn't exist, generate it first:");
    console.log("   npx drizzle-kit generate");
    process.exit(1);
  }

  await queryClient.end();
  process.exit(0);
}

main();
