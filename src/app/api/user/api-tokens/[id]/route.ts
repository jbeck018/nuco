import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * DELETE handler for removing an API token
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Token ID is required" },
        { status: 400 }
      );
    }

    // Delete the token, ensuring it belongs to the current user
    const result = await db
      .delete(apiTokens)
      .where(
        and(
          eq(apiTokens.id, id),
          eq(apiTokens.userId, session.user.id)
        )
      )
      .returning({ id: apiTokens.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Token not found or not authorized to delete" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting API token:", error);
    return NextResponse.json(
      { error: "Failed to delete API token" },
      { status: 500 }
    );
  }
} 