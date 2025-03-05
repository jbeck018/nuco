/**
 * Extensions Schema
 * 
 * This file defines the database schema for the extension framework.
 */

import { pgTable, text, timestamp, uuid, boolean, jsonb } from "drizzle-orm/pg-core";
import { users, organizations } from "@/lib/db/schema";

/**
 * Extensions table
 * Stores information about installed extensions
 */
export const extensions = pgTable("extensions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  version: text("version").notNull(),
  type: text("type").notNull(), // "slack", "chrome", "salesforce", "api"
  author: jsonb("author"), // { name, email, url }
  entryPoints: jsonb("entry_points"), // { main, settings, background }
  permissions: jsonb("permissions"), // ["storage", "network", "slack:read", etc.]
  settings: jsonb("settings"), // Extension settings schema and values
  hooks: jsonb("hooks"), // Event hooks configuration
  isActive: boolean("is_active").default(true).notNull(),
  isSystem: boolean("is_system").default(false).notNull(), // System extensions can't be uninstalled
  installationSource: text("installation_source").default("custom").notNull(), // "marketplace", "custom", "system"
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at", { mode: "date" }),
});

/**
 * Extension marketplace table
 * Stores information about extensions available in the marketplace
 */
export const extensionMarketplace = pgTable("extension_marketplace", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  version: text("version").notNull(),
  type: text("type").notNull(), // "slack", "chrome", "salesforce", "api"
  author: jsonb("author"), // { name, email, url }
  entryPoints: jsonb("entry_points"), // { main, settings, background }
  permissions: jsonb("permissions"), // ["storage", "network", "slack:read", etc.]
  settings: jsonb("settings"), // Extension settings schema
  hooks: jsonb("hooks"), // Event hooks configuration
  isVerified: boolean("is_verified").default(false).notNull(), // Verified by marketplace administrators
  isPublished: boolean("is_published").default(false).notNull(), // Published to the marketplace
  downloadCount: text("download_count").default("0").notNull(),
  rating: text("rating").default("0").notNull(),
  packageUrl: text("package_url").notNull(), // URL to download the extension package
  iconUrl: text("icon_url"), // URL to the extension icon
  screenshotUrls: jsonb("screenshot_urls"), // URLs to extension screenshots
  websiteUrl: text("website_url"), // URL to the extension website
  supportUrl: text("support_url"), // URL to the extension support page
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  publishedAt: timestamp("published_at", { mode: "date" }),
});

/**
 * Extension storage table
 * Provides isolated storage for extensions
 */
export const extensionStorage = pgTable("extension_storage", {
  id: uuid("id").primaryKey().defaultRandom(),
  extensionId: uuid("extension_id").references(() => extensions.id, { onDelete: "cascade" }).notNull(),
  key: text("key").notNull(),
  value: jsonb("value"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Extension logs table
 * Stores logs from extensions for debugging and monitoring
 */
export const extensionLogs = pgTable("extension_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  extensionId: uuid("extension_id").references(() => extensions.id, { onDelete: "cascade" }).notNull(),
  level: text("level").notNull(), // "info", "warn", "error"
  message: text("message").notNull(),
  details: jsonb("details"),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
});

/**
 * Extension reviews table
 * Stores user reviews of marketplace extensions
 */
export const extensionReviews = pgTable("extension_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  extensionMarketplaceId: uuid("extension_marketplace_id").references(() => extensionMarketplace.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  rating: text("rating").notNull(), // 1-5 stars
  title: text("title"),
  content: text("content"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}); 