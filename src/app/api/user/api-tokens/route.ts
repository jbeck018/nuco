export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { uuidv4, generateSecureToken } from "@/lib/utils/edge-crypto";

/**
 * GET handler for retrieving user API tokens
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's API tokens
    const tokens = await db.query.apiTokens.findMany({
      where: eq(apiTokens.userId, session.user.id),
      orderBy: (apiTokens, { desc }) => [desc(apiTokens.createdAt)],
    });

    // Don't return the actual token values for security
    const sanitizedTokens = tokens.map(({ token, ...rest }) => ({
      ...rest,
      // Only return the last 4 characters of the token
      token: `...${token.slice(-4)}`,
    }));

    return NextResponse.json(sanitizedTokens);
  } catch (error) {
    console.error("Error retrieving API tokens:", error);
    return NextResponse.json(
      { error: "Failed to retrieve API tokens" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new API token
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the request body
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Token name is required" },
        { status: 400 }
      );
    }

    // Generate a secure random token
    const token = await generateSecureToken(32);

    // Create the API token
    const [newToken] = await db
      .insert(apiTokens)
      .values({
        id: uuidv4(),
        userId: session.user.id,
        name,
        token,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      ...newToken,
      token, // Return the full token only on creation
    });
  } catch (error) {
    console.error("Error creating API token:", error);
    return NextResponse.json(
      { error: "Failed to create API token" },
      { status: 500 }
    );
  }
} 