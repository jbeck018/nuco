import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import * as schema from "./schema";

/**
 * Database client instance using Drizzle ORM with Vercel Postgres
 * This provides a type-safe interface to our database
 */
export const db = drizzle(sql, { schema });

/**
 * Export schema for use in other parts of the application
 */
export { schema }; 