/**
 * Complete Signup API Route
 * 
 * This route handles completing the signup process for OAuth users
 * by creating or updating their organization.
 */

export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createOrganization, getUserOrganizations } from "@/lib/organizations/service";

// Define the request schema
const completeSignupSchema = z.object({
  userId: z.string(),
  organizationName: z.string().min(2),
});

/**
 * POST handler for the complete-signup route
 * @param request The incoming request
 * @returns A response with the result of the operation
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the current session
    const session = await auth();
    
    // Check if the user is authenticated
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Parse and validate the request body
    const body = await request.json();
    const result = completeSignupSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { message: "Invalid request data", errors: result.error.errors },
        { status: 400 }
      );
    }
    
    const { userId, organizationName } = result.data;
    
    // Ensure the authenticated user is the same as the one being updated
    if (session.user.id !== userId) {
      return NextResponse.json(
        { message: "Unauthorized: You can only update your own account" },
        { status: 403 }
      );
    }
    
    // Check if the user already has organizations
    const organizations = await getUserOrganizations(userId);
    
    // If the user has no organizations, create one with the provided name
    if (organizations.length === 0) {
      const org = await createOrganization({
        name: organizationName,
        userId: userId,
        billingEmail: session.user.email || "",
      });
      
      if (!org) {
        throw new Error("Failed to create organization");
      }
      
      return NextResponse.json({
        message: "Organization created successfully",
        organizationId: org.id,
      });
    } 
    // If the user already has organizations, update the first one
    else {
      // In a real application, you might want to implement an update function
      // For now, we'll just return success since the user already has an organization
      return NextResponse.json({
        message: "User already has an organization",
        organizationId: organizations[0].id,
      });
    }
  } catch (error) {
    console.error("Complete signup error:", error);
    
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 