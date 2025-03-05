import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./password";

/**
 * Get a user by email
 * @param email - The email of the user to find
 * @returns The user object or null if not found
 */
export async function getUserByEmail(email: string) {
  try {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0] || null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
}

/**
 * Get a user by ID
 * @param id - The ID of the user to find
 * @returns The user object or null if not found
 */
export async function getUserById(id: string) {
  try {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0] || null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
}

/**
 * Create a new user
 * @param userData - The user data to create
 * @returns The created user object or null if creation failed
 */
export async function createUser({
  name,
  email,
  password,
  image,
}: {
  name?: string;
  email: string;
  password: string;
  image?: string;
}) {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return null;
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user
    const result = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      image,
      role: "user",
    }).returning();

    return result[0];
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

/**
 * Get user accounts
 * @param userId - The ID of the user
 * @returns Array of user accounts
 */
export async function getUserAccounts(userId: string) {
  try {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  } catch (error) {
    console.error("Error getting user accounts:", error);
    return [];
  }
}

/**
 * Update user profile
 * @param userId - The ID of the user to update
 * @param data - The data to update
 * @returns The updated user or null if update failed
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; image?: string }
) {
  try {
    const result = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    return result[0];
  } catch (error) {
    console.error("Error updating user profile:", error);
    return null;
  }
} 