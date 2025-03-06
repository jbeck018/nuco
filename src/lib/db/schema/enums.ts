import { pgEnum } from "drizzle-orm/pg-core";

/**
 * User role enum
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

/**
 * Organization role enum
 */
export const organizationRoleEnum = pgEnum("organization_role", ["member", "admin", "owner"]);

/**
 * Integration type enum
 */
export const integrationTypeEnum = pgEnum("integration_type", ["salesforce", "hubspot", "google", "slack"]);