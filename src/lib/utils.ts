import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"
import { StreamTextResult, ToolSet } from 'ai'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
}

export function formatDate(date: Date, formatString: string = "MMM d, yyyy") {
  return format(date, formatString);
}

export function formatDateRelative(date: Date) {
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Process a StreamTextResult from the AI SDK and convert it to a string by calling a callback for each chunk
 * @param stream - The StreamTextResult to process
 * @param onChunk - Callback function that receives each chunk as it's processed
 * @returns A promise that resolves when the stream is fully processed
 */
export async function streamToString<T extends ToolSet = ToolSet>(
  stream: StreamTextResult<T, unknown>,
  onChunk: (chunk: string) => void
): Promise<void> {
  // The textStream is an AsyncIterable that yields text chunks
  for await (const chunk of stream.textStream) {
    onChunk(chunk);
  }
}

/**
 * Convert a string to a URL-friendly slug
 * @param text - The text to convert to a slug
 * @returns The slugified text
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/&/g, '-and-')   // Replace & with 'and'
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
}

/**
 * Get the base URL for the application
 * @returns The base URL
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return '';
  }
  
  if (process.env.VERCEL_URL) {
    // SSR should use Vercel URL
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Dev SSR should use localhost
  return `http://localhost:${process.env.PORT || 3000}`;
}

