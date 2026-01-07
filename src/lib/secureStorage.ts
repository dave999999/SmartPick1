/**
 * Secure Storage Wrapper using Capacitor Preferences
 * 
 * Provides encrypted storage for sensitive data on native platforms.
 * Falls back to localStorage on web with clear warnings.
 * 
 * Usage:
 *   import { secureStorage } from '@/lib/secureStorage';
 *   
 *   await secureStorage.set('key', { sensitive: 'data' });
 *   const data = await secureStorage.get('key');
 *   await secureStorage.remove('key');
 */

import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { logger } from './logger';

class SecureStorage {
  private readonly platform: string;
  
  constructor() {
    this.platform = Capacitor.getPlatform();
  }

  /**
   * Check if running on native platform with encryption support
   */
  isSecure(): boolean {
    return this.platform === 'android' || this.platform === 'ios';
  }

  /**
   * Store data securely (encrypted on native platforms)
   * @param key - Storage key
   * @param value - Data to store (will be JSON stringified)
   */
  async set(key: string, value: any): Promise<void> {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (this.isSecure()) {
        // Native: Encrypted storage via Preferences
        await Preferences.set({
          key,
          value: stringValue
        });
        logger.debug(`[SecureStorage] Stored encrypted data for key: ${key}`);
      } else {
        // Web fallback: localStorage (NOT encrypted)
        logger.warn(`[SecureStorage] Using localStorage fallback (unencrypted) for key: ${key}`);
        localStorage.setItem(key, stringValue);
      }
    } catch (error) {
      logger.error('[SecureStorage] Failed to store data:', error);
      throw error;
    }
  }

  /**
   * Retrieve data from secure storage
   * @param key - Storage key
   * @returns Parsed value or null if not found
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      if (this.isSecure()) {
        // Native: Read from encrypted storage
        const { value } = await Preferences.get({ key });
        
        if (!value) {
          // Try migrating from localStorage if exists
          const legacyValue = localStorage.getItem(key);
          if (legacyValue) {
            logger.info(`[SecureStorage] Migrating data from localStorage to secure storage: ${key}`);
            await this.set(key, legacyValue);
            localStorage.removeItem(key); // Clean up old data
            return this.parseValue<T>(legacyValue);
          }
          return null;
        }
        
        return this.parseValue<T>(value);
      } else {
        // Web fallback: Read from localStorage
        const value = localStorage.getItem(key);
        return value ? this.parseValue<T>(value) : null;
      }
    } catch (error) {
      logger.error('[SecureStorage] Failed to retrieve data:', error);
      return null;
    }
  }

  /**
   * Remove data from secure storage
   * @param key - Storage key
   */
  async remove(key: string): Promise<void> {
    try {
      if (this.isSecure()) {
        await Preferences.remove({ key });
        logger.debug(`[SecureStorage] Removed encrypted data for key: ${key}`);
      } else {
        localStorage.removeItem(key);
      }
    } catch (error) {
      logger.error('[SecureStorage] Failed to remove data:', error);
      throw error;
    }
  }

  /**
   * Clear all secure storage data
   * WARNING: This removes ALL stored preferences
   */
  async clear(): Promise<void> {
    try {
      if (this.isSecure()) {
        await Preferences.clear();
        logger.warn('[SecureStorage] Cleared all encrypted storage');
      } else {
        localStorage.clear();
      }
    } catch (error) {
      logger.error('[SecureStorage] Failed to clear storage:', error);
      throw error;
    }
  }

  /**
   * Get all keys in secure storage
   * @returns Array of storage keys
   */
  async keys(): Promise<string[]> {
    try {
      if (this.isSecure()) {
        const { keys } = await Preferences.keys();
        return keys;
      } else {
        return Object.keys(localStorage);
      }
    } catch (error) {
      logger.error('[SecureStorage] Failed to get keys:', error);
      return [];
    }
  }

  /**
   * Migrate specific localStorage key to secure storage
   * @param key - Key to migrate
   */
  async migrateFromLocalStorage(key: string): Promise<boolean> {
    try {
      if (!this.isSecure()) {
        logger.debug('[SecureStorage] Migration not needed on web platform');
        return false;
      }

      const legacyValue = localStorage.getItem(key);
      if (legacyValue) {
        logger.info(`[SecureStorage] Migrating key from localStorage: ${key}`);
        await this.set(key, legacyValue);
        localStorage.removeItem(key);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('[SecureStorage] Migration failed:', error);
      return false;
    }
  }

  /**
   * Migrate all localStorage data to secure storage
   * Useful for one-time migration after app update
   */
  async migrateAll(): Promise<number> {
    if (!this.isSecure()) return 0;

    let migratedCount = 0;
    const keysToMigrate = Object.keys(localStorage);

    for (const key of keysToMigrate) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          await this.set(key, value);
          localStorage.removeItem(key);
          migratedCount++;
        }
      } catch (error) {
        logger.error(`[SecureStorage] Failed to migrate key: ${key}`, error);
      }
    }

    if (migratedCount > 0) {
      logger.info(`[SecureStorage] Migrated ${migratedCount} items from localStorage`);
    }

    return migratedCount;
  }

  /**
   * Helper to parse stored JSON values
   */
  private parseValue<T>(value: string): T | null {
    try {
      return JSON.parse(value) as T;
    } catch {
      // Return as-is if not JSON
      return value as unknown as T;
    }
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Export type for TypeScript consumers
export type { SecureStorage };
