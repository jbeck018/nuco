import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { getUserByEmail } from "@/lib/auth/data";
import { createOrganization } from "@/lib/organizations/service";
import { slugify } from "@/lib/utils";

// Define the signup request schema
const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(2).optional(),
});

export async function POST(req: Request) {
  try {
    // Parse and validate the request body
    const body = await req.json();
    const validatedData = signupSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await getUserByEmail(validatedData.email);
    
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: "user", // Default role
      })
      .returning();
    
    // Create an organization for the user
    const organizationName = validatedData.organizationName || `${validatedData.name}'s Organization`;
    
    try {
      // Create the organization and add the user as owner
      await createOrganization({
        name: organizationName,
        userId: newUser.id,
        billingEmail: validatedData.email,
      });
    } catch (orgError) {
      console.error("Error creating organization:", orgError);
      // We'll still return the user, but log the error
    }
    
    // Return the created user (without password)
    return NextResponse.json(
      {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
} 