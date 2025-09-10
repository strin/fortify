"use client";

/**
 * Session storage utilities for preserving application state across page refreshes.
 * This helps maintain user context even if the browser discards the tab.
 */

export class SessionStorage {
  private static isClient = typeof window !== 'undefined';

  /**
   * Save data to session storage with error handling
   */
  static save<T>(key: string, data: T): void {
    if (!this.isClient) return;
    
    try {
      const serializedData = JSON.stringify(data);
      sessionStorage.setItem(key, serializedData);
    } catch (error) {
      console.warn(`Failed to save to session storage:`, error);
    }
  }

  /**
   * Load data from session storage with error handling
   */
  static load<T>(key: string): T | null {
    if (!this.isClient) return null;
    
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(`Failed to load from session storage:`, error);
      return null;
    }
  }

  /**
   * Remove item from session storage
   */
  static remove(key: string): void {
    if (!this.isClient) return;
    
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove from session storage:`, error);
    }
  }

  /**
   * Clear all session storage
   */
  static clear(): void {
    if (!this.isClient) return;
    
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn(`Failed to clear session storage:`, error);
    }
  }

  /**
   * Check if session storage is available
   */
  static isAvailable(): boolean {
    if (!this.isClient) return false;
    
    try {
      const testKey = '__test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Hook for managing session storage state with React
 */
import { useState, useEffect, useCallback } from 'react';

export function useSessionStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    const stored = SessionStorage.load<T>(key);
    return stored !== null ? stored : defaultValue;
  });

  const setValue = useCallback((value: T) => {
    setState(value);
    SessionStorage.save(key, value);
  }, [key]);

  useEffect(() => {
    const stored = SessionStorage.load<T>(key);
    if (stored !== null) {
      setState(stored);
    }
  }, [key]);

  return [state, setValue];
}