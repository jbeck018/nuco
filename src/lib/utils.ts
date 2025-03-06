import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { StreamTextResult, ToolSet } from 'ai';

/**
 * Combines multiple class names into a single string, merging Tailwind CSS classes efficiently
 * @param inputs - Class values to be combined
 * @returns A string of combined and merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date to a localized string with options for relative or default formatting
 * @param date - The date to format 
 * @param format - Format style: 'relative' for time-ago format or 'default' for standard date
 * @returns A formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions | 'relative' = {
    month: "long",
    day: "numeric",
    year: "numeric",
  }
): string {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
      
    if (options === 'relative') {
      // Relative time formatting (e.g., "2 days ago")
      const now = new Date();
      const diffInMs = now.getTime() - dateObj.getTime();
      const diffInSecs = Math.floor(diffInMs / 1000);
      const diffInMins = Math.floor(diffInSecs / 60);
      const diffInHours = Math.floor(diffInMins / 60);
      const diffInDays = Math.floor(diffInHours / 24);
      
      if (diffInSecs < 60) return `${diffInSecs} seconds ago`;
      if (diffInMins < 60) return `${diffInMins} minutes ago`;
      if (diffInHours < 24) return `${diffInHours} hours ago`;
      if (diffInDays < 7) return `${diffInDays} days ago`;
      
      // Fall back to standard format for older dates
      return dateObj.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    
    return dateObj.toLocaleDateString(undefined, 
      typeof options === 'object' ? options : undefined
    );
  } catch (error) {
    console.error("Date formatting error:", error);
    return String(date);
  }
}

/**
 * Truncates a string to a specified length and adds ellipsis
 * @param str - The string to truncate
 * @param length - Maximum length before truncation
 * @returns The truncated string
 */
export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

/**
 * Converts a string to a URL-friendly slug
 * @param str - The string to slugify
 * @returns A URL-friendly slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generates a random string of specified length
 * @param length - The length of the random string
 * @returns A random string
 */
export function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Debounces a function call by the specified time
 * @param fn - The function to debounce
 * @param ms - Debounce time in milliseconds
 * @returns A debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return function(this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Safely parses JSON with a fallback value
 * @param json - The JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns The parsed object or fallback value
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error("JSON parsing error:", error);
    return fallback;
  }
}

/**
 * Gets the base URL for the application
 * @returns The base URL
 */
export function getBaseUrl() {
  // Browser should use relative path
  if (typeof window !== "undefined") return "";
  
  // SSR should use vercel url
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Dev SSR should use localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Gets initials from a name
 * @param name - The name to extract initials from
 * @param maxLength - Maximum number of initials
 * @returns The initials
 */
export function getInitials(name: string, maxLength = 2): string {
  if (!name) return "";
  
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, maxLength)
    .join("");
}

/**
 * Convert a StreamTextResult to a string
 * @param stream - The StreamTextResult to convert
 * @param onChunk - Optional callback that will be called with each chunk of text as it arrives
 * @returns A promise that resolves to the complete text
 */
export async function streamToString(
  stream: StreamTextResult<ToolSet, never>,
  onChunk?: (chunk: string) => void
): Promise<string> {
  let result = '';
  
  // Basic implementation with error handling
  try {
    // Try to get a reader from the stream
    const reader = (stream as unknown as { getReader?: () => { read(): Promise<{ done: boolean; value: string }> } })
      .getReader?.() || stream;
    
    while (true) {
      const { done, value } = await (reader as { read(): Promise<{ done: boolean; value: string }> }).read();
      if (done) break;
      
      // Add the chunk to the result
      result += value;
      
      // Call the callback if provided
      if (onChunk) {
        onChunk(value);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error reading stream:', error);
    throw new Error('Failed to read stream');
  }
}

/**
 * Gets a nested property from an object using a dot-notation path
 * @param obj - The object to extract the property from
 * @param path - Dot-notation path to the property (e.g., 'user.address.city')
 * @param defaultValue - Default value if property doesn't exist
 * @returns The property value or default value
 */
export function getNestedProperty<T>(
  obj: Record<string, unknown> | null | undefined,
  path: string,
  defaultValue: T
): T {
  if (!obj) return defaultValue;
  
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    
    current = (current as Record<string, unknown>)[key];
    
    if (current === undefined) {
      return defaultValue;
    }
  }
  
  return current as T;
}

/**
 * Checks if the current environment is a browser
 * @returns True if the code is running in a browser
 */
export const isBrowser = typeof window !== "undefined";

/**
 * Checks if the current environment is a server
 * @returns True if the code is running on a server
 */
export const isServer = !isBrowser; 