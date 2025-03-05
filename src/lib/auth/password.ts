import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Convert scrypt to a promise-based function
const scryptAsync = promisify(scrypt);

/**
 * Hash a password with a random salt
 * @param password - The plain text password to hash
 * @returns A string in the format `salt:hash`
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = randomBytes(16).toString("hex");
  
  // Hash the password with the salt
  const hash = await scryptAsync(password, salt, 64) as Buffer;
  
  // Return the salt and hash combined
  return `${salt}:${hash.toString("hex")}`;
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
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  
  // Convert the stored hash to a buffer for comparison
  const storedHashBuffer = Buffer.from(storedHash, "hex");
  
  // Compare the hashes using a timing-safe comparison
  return timingSafeEqual(hash, storedHashBuffer);
} 