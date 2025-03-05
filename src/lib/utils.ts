import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class names into a single string, merging Tailwind CSS classes efficiently
 * @param inputs - Class values to be combined
 * @returns A string of combined and merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date to a localized string
 * @param date - The date to format
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns A formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  }
): string {
  return new Date(date).toLocaleDateString("en-US", options);
}

/**
 * Truncates a string to a specified length and adds an ellipsis
 * @param str - The string to truncate
 * @param length - The maximum length of the string
 * @returns The truncated string
 */
export function truncate(str: string, length: number): string {
  if (!str || str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

/**
 * Converts a string to a URL-friendly slug
 * @param str - The string to convert to a slug
 * @returns A URL-friendly slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
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
 * Debounces a function call
 * @param fn - The function to debounce
 * @param ms - The debounce delay in milliseconds
 * @returns A debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms = 300
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

/**
 * Safely parses JSON without throwing an error
 * @param json - The JSON string to parse
 * @param fallback - The fallback value if parsing fails
 * @returns The parsed JSON or fallback value
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
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

/**
 * Get the base URL of the application
 * This is used for generating absolute URLs for redirects, etc.
 */
export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // In the browser, use the current URL
    return window.location.origin;
  }
  
  // In Node.js, use environment variables or default to localhost
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

/**
 * Extracts initials from a name
 * @param name - The name to extract initials from
 * @param maxLength - Maximum number of initials to return (default: 2)
 * @returns The initials from the name
 */
export function getInitials(name: string, maxLength = 2): string {
  if (!name) return "";
  
  return name
    .split(/\s+/)
    .map(word => word[0]?.toUpperCase() || "")
    .filter(Boolean)
    .slice(0, maxLength)
    .join("");
} 