import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import * as schema from "./schema";


config({ path: ".env" }); // or .env.local
/**
 * Database client instance using Drizzle ORM with Vercel Postgres
 * This provides a type-safe interface to our database
 */
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle({ client: sql, schema });

/**
 * Export schema for use in other parts of the application
 */
export { schema }; 