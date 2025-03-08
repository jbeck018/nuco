export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createPromptTemplate,
  listUserPromptTemplates,
  listOrganizationPromptTemplates,
  promptTemplateSchema,
} from "@/lib/ai/templates";
import { z } from "zod";

/**
 * GET handler for listing prompt templates
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || undefined;
    const tagsParam = searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",") : undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!, 10)
      : undefined;
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!, 10)
      : undefined;
    const organizationId = searchParams.get("organizationId") || undefined;

    // Get templates based on whether organization ID is provided
    const templates = organizationId
      ? await listOrganizationPromptTemplates(organizationId, {
          search,
          tags,
          limit,
          offset,
        })
      : await listUserPromptTemplates(session.user.id, {
          search,
          tags,
          limit,
          offset,
        });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Error listing prompt templates:", error);
    return NextResponse.json(
      { error: "Failed to list prompt templates" },
      { status: 500 }
    );
  }
}

/**
 * POST handler for creating a new prompt template
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();

    // Validate the request body
    const validatedData = promptTemplateSchema.parse({
      ...body,
      userId: session.user.id,
    });

    // Create the prompt template
    const templateId = await createPromptTemplate(validatedData);

    return NextResponse.json({ id: templateId }, { status: 201 });
  } catch (error) {
    console.error("Error creating prompt template:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create prompt template" },
      { status: 500 }
    );
  }
}
