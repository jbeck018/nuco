/**
 * Extension Service
 * 
 * This file provides services for managing extensions, including:
 * - Installing extensions
 * - Uninstalling extensions
 * - Enabling/disabling extensions
 * - Getting extension details
 * - Managing extension settings
 */

import { db } from '@/lib/db';
import { extensions, extensionStorage } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { validateManifest, ExtensionManifest } from './schema';

// Define the extension type from the database schema
type Extension = typeof extensions.$inferSelect;

/**
 * Extension service class
 */
export class ExtensionService {
  /**
   * Get all extensions for a user or organization
   * @param userId User ID
   * @param organizationId Organization ID
   * @returns Array of extensions
   */
  async getExtensions(userId?: string, organizationId?: string): Promise<Extension[]> {
    try {
      const query = db.select().from(extensions);
      
      if (userId && organizationId) {
        return await db.select().from(extensions).where(
          and(
            eq(extensions.userId, userId),
            eq(extensions.organizationId, organizationId)
          )
        );
      } else if (userId) {
        return await db.select().from(extensions).where(eq(extensions.userId, userId));
      } else if (organizationId) {
        return await db.select().from(extensions).where(eq(extensions.organizationId, organizationId));
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting extensions:', error);
      throw new Error('Failed to get extensions');
    }
  }
  
  /**
   * Get an extension by ID
   * @param id Extension ID
   * @returns Extension or null if not found
   */
  async getExtensionById(id: string): Promise<Extension | null> {
    try {
      const results = await db
        .select()
        .from(extensions)
        .where(eq(extensions.id, id))
        .limit(1);
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error getting extension by ID:', error);
      throw new Error('Failed to get extension');
    }
  }
  
  /**
   * Install an extension
   * @param manifest Extension manifest
   * @param userId User ID
   * @param organizationId Organization ID
   * @param source Installation source
   * @returns The installed extension
   */
  async installExtension(
    manifest: ExtensionManifest,
    userId: string,
    organizationId?: string,
    source: 'marketplace' | 'custom' | 'system' = 'custom'
  ): Promise<Extension> {
    try {
      // Validate the manifest
      const validatedManifest = validateManifest(manifest);
      
      // Insert the extension into the database
      const [extension] = await db.insert(extensions).values({
        name: validatedManifest.name,
        description: validatedManifest.description || '',
        version: validatedManifest.version,
        type: validatedManifest.type,
        author: validatedManifest.author,
        entryPoints: validatedManifest.entryPoints,
        permissions: validatedManifest.permissions,
        settings: validatedManifest.settings || { configurable: false, schema: {} },
        hooks: validatedManifest.hooks,
        isActive: true,
        isSystem: source === 'system',
        installationSource: source,
        userId,
        organizationId,
      }).returning();
      
      return extension;
    } catch (error) {
      console.error('Error installing extension:', error);
      throw new Error('Failed to install extension');
    }
  }
  
  /**
   * Uninstall an extension
   * @param id Extension ID
   * @returns True if successful
   */
  async uninstallExtension(id: string): Promise<boolean> {
    try {
      // Check if the extension is a system extension
      const extension = await this.getExtensionById(id);
      
      if (!extension) {
        throw new Error('Extension not found');
      }
      
      if (extension.isSystem) {
        throw new Error('Cannot uninstall system extensions');
      }
      
      // Delete the extension
      await db.delete(extensions).where(eq(extensions.id, id));
      
      return true;
    } catch (error) {
      console.error('Error uninstalling extension:', error);
      throw new Error('Failed to uninstall extension');
    }
  }
  
  /**
   * Enable an extension
   * @param id Extension ID
   * @returns The updated extension
   */
  async enableExtension(id: string): Promise<Extension> {
    try {
      const [extension] = await db
        .update(extensions)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(extensions.id, id))
        .returning();
      
      return extension;
    } catch (error) {
      console.error('Error enabling extension:', error);
      throw new Error('Failed to enable extension');
    }
  }
  
  /**
   * Disable an extension
   * @param id Extension ID
   * @returns The updated extension
   */
  async disableExtension(id: string): Promise<Extension> {
    try {
      const [extension] = await db
        .update(extensions)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(extensions.id, id))
        .returning();
      
      return extension;
    } catch (error) {
      console.error('Error disabling extension:', error);
      throw new Error('Failed to disable extension');
    }
  }
  
  /**
   * Update extension settings
   * @param id Extension ID
   * @param settings New settings
   * @returns The updated extension
   */
  async updateExtensionSettings(id: string, settings: Record<string, unknown>): Promise<Extension> {
    try {
      // Get the current extension
      const extension = await this.getExtensionById(id);
      
      if (!extension) {
        throw new Error('Extension not found');
      }
      
      // Check if the extension has configurable settings
      const currentSettings = extension.settings as { configurable: boolean; schema: Record<string, unknown>; values?: Record<string, unknown> };
      
      if (!currentSettings.configurable) {
        throw new Error('Extension settings are not configurable');
      }
      
      // Update the settings
      const updatedSettings = {
        ...currentSettings,
        values: settings,
      };
      
      // Save the updated settings
      const [updatedExtension] = await db
        .update(extensions)
        .set({ 
          settings: updatedSettings,
          updatedAt: new Date()
        })
        .where(eq(extensions.id, id))
        .returning();
      
      return updatedExtension;
    } catch (error) {
      console.error('Error updating extension settings:', error);
      throw new Error('Failed to update extension settings');
    }
  }
  
  /**
   * Get extension storage value
   * @param extensionId Extension ID
   * @param key Storage key
   * @returns The stored value or null if not found
   */
  async getStorageValue(extensionId: string, key: string): Promise<unknown> {
    try {
      const results = await db
        .select()
        .from(extensionStorage)
        .where(
          and(
            eq(extensionStorage.extensionId, extensionId),
            eq(extensionStorage.key, key)
          )
        )
        .limit(1);
      
      return results.length > 0 ? results[0].value : null;
    } catch (error) {
      console.error('Error getting storage value:', error);
      throw new Error('Failed to get storage value');
    }
  }
  
  /**
   * Set extension storage value
   * @param extensionId Extension ID
   * @param key Storage key
   * @param value Value to store
   * @returns True if successful
   */
  async setStorageValue(extensionId: string, key: string, value: unknown): Promise<boolean> {
    try {
      // Check if the key already exists
      const existingItem = await this.getStorageValue(extensionId, key);
      
      if (existingItem !== null) {
        // Update existing item
        await db
          .update(extensionStorage)
          .set({ 
            value,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(extensionStorage.extensionId, extensionId),
              eq(extensionStorage.key, key)
            )
          );
      } else {
        // Insert new item
        await db.insert(extensionStorage).values({
          extensionId,
          key,
          value,
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error setting storage value:', error);
      throw new Error('Failed to set storage value');
    }
  }
  
  /**
   * Delete extension storage value
   * @param extensionId Extension ID
   * @param key Storage key
   * @returns True if successful
   */
  async deleteStorageValue(extensionId: string, key: string): Promise<boolean> {
    try {
      await db
        .delete(extensionStorage)
        .where(
          and(
            eq(extensionStorage.extensionId, extensionId),
            eq(extensionStorage.key, key)
          )
        );
      
      return true;
    } catch (error) {
      console.error('Error deleting storage value:', error);
      throw new Error('Failed to delete storage value');
    }
  }
}

/**
 * Create a new extension service instance
 */
export function createExtensionService(): ExtensionService {
  return new ExtensionService();
} 