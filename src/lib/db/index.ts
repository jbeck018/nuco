import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { getEnv } from "@/lib/env";

/**
 * Database client instance using Drizzle ORM with Neon Serverless
 * This provides a type-safe interface to our database
 * 
 * When deployed to Cloudflare, Hyperdrive will automatically intercept
 * and optimize database connections without any code changes
 */
const { DATABASE_URL } = getEnv();
const sql = neon(DATABASE_URL);

export const db = drizzle(sql, { schema });

/**
 * Export schema for use in other parts of the application
 */
export { schema }; 