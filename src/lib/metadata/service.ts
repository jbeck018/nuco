/**
 * metadata/service.ts
 * 
 * Service functions for managing metadata, user preferences, and settings.
 * This file provides a unified API for interacting with metadata tables.
 */
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { 
  metadata,
  NewMetadata,
} from '@/lib/db/schema/metadata';
import {
  userPreferences,
  NewUserPreferences,
} from '@/lib/db/schema/user-preferences';
import {
  organizationSettings,
  NewOrganizationSettings,
} from '@/lib/db/schema/organization-settings';
import {
  integrationSettings,
  NewIntegrationSettings,
} from '@/lib/db/schema/integration-settings';

/**
 * Generic metadata functions
 */

// Get metadata by entity type, ID, and key
export async function getMetadata(entityType: string, entityId: string, key: string) {
  const result = await db
    .select()
    .from(metadata)
    .where(
      and(
        eq(metadata.entityType, entityType),
        eq(metadata.entityId, entityId),
        eq(metadata.key, key)
      )
    )
    .limit(1);
  
  return result[0] || null;
}

// Get all metadata for an entity
export async function getAllMetadata(entityType: string, entityId: string) {
  return db
    .select()
    .from(metadata)
    .where(
      and(
        eq(metadata.entityType, entityType),
        eq(metadata.entityId, entityId)
      )
    );
}

// Set metadata for an entity
export async function setMetadata(data: NewMetadata) {
  // Check if metadata already exists
  const existing = await getMetadata(
    data.entityType,
    data.entityId,
    data.key
  );
  
  if (existing) {
    // Update existing metadata
    return db
      .update(metadata)
      .set({
        value: data.value,
        updatedAt: new Date(),
      })
      .where(eq(metadata.id, existing.id))
      .returning();
  } else {
    // Insert new metadata
    return db.insert(metadata).values(data).returning();
  }
}

// Delete metadata
export async function deleteMetadata(entityType: string, entityId: string, key: string) {
  return db
    .delete(metadata)
    .where(
      and(
        eq(metadata.entityType, entityType),
        eq(metadata.entityId, entityId),
        eq(metadata.key, key)
      )
    )
    .returning();
}

// Delete all metadata for an entity
export async function deleteAllMetadata(entityType: string, entityId: string) {
  return db
    .delete(metadata)
    .where(
      and(
        eq(metadata.entityType, entityType),
        eq(metadata.entityId, entityId)
      )
    )
    .returning();
}

/**
 * User preferences functions
 */

// Get user preferences
export async function getUserPreferences(userId: string) {
  const result = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  
  return result[0] || null;
}

// Create or update user preferences
export async function setUserPreferences(data: NewUserPreferences) {
  const existing = await getUserPreferences(data.userId);
  
  if (existing) {
    // Update existing preferences
    return db
      .update(userPreferences)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.id, existing.id))
      .returning();
  } else {
    // Insert new preferences
    return db.insert(userPreferences).values(data).returning();
  }
}

// Update specific user preference fields
export async function updateUserPreferences(
  userId: string,
  data: Partial<Omit<NewUserPreferences, 'userId' | 'id'>>
) {
  const existing = await getUserPreferences(userId);
  
  if (!existing) {
    // Create with default values and the specified updates
    return setUserPreferences({
      userId,
      ...data,
    } as NewUserPreferences);
  }
  
  // Update the specified fields
  return db
    .update(userPreferences)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(userPreferences.id, existing.id))
    .returning();
}

// Delete user preferences
export async function deleteUserPreferences(userId: string) {
  return db
    .delete(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .returning();
}

/**
 * Organization settings functions
 */

// Get organization settings
export async function getOrganizationSettings(organizationId: string) {
  const result = await db
    .select()
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, organizationId))
    .limit(1);
  
  return result[0] || null;
}

// Create or update organization settings
export async function setOrganizationSettings(data: NewOrganizationSettings) {
  const existing = await getOrganizationSettings(data.organizationId);
  
  if (existing) {
    // Update existing settings
    return db
      .update(organizationSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(organizationSettings.id, existing.id))
      .returning();
  } else {
    // Insert new settings
    return db.insert(organizationSettings).values(data).returning();
  }
}

// Update specific organization settings fields
export async function updateOrganizationSettings(
  organizationId: string,
  data: Partial<Omit<NewOrganizationSettings, 'organizationId' | 'id'>>
) {
  const existing = await getOrganizationSettings(organizationId);
  
  if (!existing) {
    // Create with default values and the specified updates
    return setOrganizationSettings({
      organizationId,
      ...data,
    } as NewOrganizationSettings);
  }
  
  // Update the specified fields
  return db
    .update(organizationSettings)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(organizationSettings.id, existing.id))
    .returning();
}

// Delete organization settings
export async function deleteOrganizationSettings(organizationId: string) {
  return db
    .delete(organizationSettings)
    .where(eq(organizationSettings.organizationId, organizationId))
    .returning();
}

/**
 * Integration settings functions
 */

// Get integration settings
export async function getIntegrationSettings(integrationId: string) {
  const result = await db
    .select()
    .from(integrationSettings)
    .where(eq(integrationSettings.integrationId, integrationId))
    .limit(1);
  
  return result[0] || null;
}

// Create or update integration settings
export async function setIntegrationSettings(data: NewIntegrationSettings) {
  const existing = await getIntegrationSettings(data.integrationId);
  
  if (existing) {
    // Update existing settings
    return db
      .update(integrationSettings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(integrationSettings.id, existing.id))
      .returning();
  } else {
    // Insert new settings
    return db.insert(integrationSettings).values(data).returning();
  }
}

// Update specific integration settings fields
export async function updateIntegrationSettings(
  integrationId: string,
  data: Partial<Omit<NewIntegrationSettings, 'integrationId' | 'id'>>
) {
  const existing = await getIntegrationSettings(integrationId);
  
  if (!existing) {
    // Create with default values and the specified updates
    return setIntegrationSettings({
      integrationId,
      ...data,
    } as NewIntegrationSettings);
  }
  
  // Update the specified fields
  return db
    .update(integrationSettings)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(integrationSettings.id, existing.id))
    .returning();
}

// Delete integration settings
export async function deleteIntegrationSettings(integrationId: string) {
  return db
    .delete(integrationSettings)
    .where(eq(integrationSettings.integrationId, integrationId))
    .returning();
} 