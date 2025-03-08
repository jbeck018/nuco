export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
  promptTemplateSchema,
} from "@/lib/ai/templates";
import { z } from "zod";
import { IdParam } from "@/lib/shared-types";
/**
 * GET handler for retrieving a prompt template by ID
 */
export async function GET(
  request: NextRequest,
  data: { params: IdParam }
): Promise<NextResponse> {
  const params = await data.params;
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the template ID from the route params
    const { id } = params;

    // Get the template
    const template = await getPromptTemplate(id);

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Check if the user has access to the template
    if (
      template.userId !== session.user.id &&
      !template.isPublic &&
      template.organizationId !== session.user.defaultOrganizationId
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("Error retrieving prompt template:", error);
    return NextResponse.json(
      { error: "Failed to retrieve prompt template" },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating a prompt template
 */
export async function PUT(
  request: NextRequest,
  data: { params: IdParam }
): Promise<NextResponse> {
    const params = await data.params;
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the template ID from the route params
    const { id } = params;

    // Get the existing template
    const existingTemplate = await getPromptTemplate(id);

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Check if the user has permission to update the template
    if (existingTemplate.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Parse the request body
    const body = await request.json();

    // Validate the request body
    const validatedData = promptTemplateSchema.partial().parse(body);

    // Update the template
    const success = await updatePromptTemplate(id, validatedData);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating prompt template:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update prompt template" },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for deleting a prompt template
 */
export async function DELETE(
  request: NextRequest,
  data: { params: IdParam }
): Promise<NextResponse> {
  const params = await data.params;
  try {
    // Get the user session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the template ID from the route params
    const { id } = params;

    // Get the existing template
    const existingTemplate = await getPromptTemplate(id);

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Check if the user has permission to delete the template
    if (existingTemplate.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the template
    const success = await deletePromptTemplate(id);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting prompt template:", error);
    return NextResponse.json(
      { error: "Failed to delete prompt template" },
      { status: 500 }
    );
  }
}
