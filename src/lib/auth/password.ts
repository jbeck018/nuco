import { pbkdf2, randomBytesHex, timingSafeEqual } from "@/lib/utils/edge-crypto";

/**
 * Hash a password with a random salt
 * @param password - The plain text password to hash
 * @returns A string in the format `salt:hash`
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = await randomBytesHex(16);
  
  // Hash the password with the salt using PBKDF2
  const hash = await pbkdf2(password, salt);
  
  // Return the salt and hash combined
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 * @param password - The plain text password to verify
 * @param hashedPassword - The hashed password in the format `salt:hash`
 * @returns True if the password matches the hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  // Split the stored hash into salt and hash
  const [salt, storedHash] = hashedPassword.split(":");
  
  // If the format is invalid, return false
  if (!salt || !storedHash) {
    return false;
  }
  
  // Hash the provided password with the same salt
  const hash = await pbkdf2(password, salt);
  
  // Compare the hashes using a timing-safe comparison
  return timingSafeEqual(hash, storedHash);
} 