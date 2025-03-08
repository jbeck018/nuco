export const runtime = 'edge';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Define interfaces for Slack block elements
interface SlackTextObject {
  type: string;
  text: string;
  emoji?: boolean;
}

interface SlackButtonElement {
  type: string;
  text: SlackTextObject;
  value: string;
  action_id: string;
}

interface SlackBlock {
  type: string;
  text?: SlackTextObject;
  accessory?: SlackButtonElement;
}

/**
 * Handle POST requests for Slack templates commands
 * This endpoint will be called by the Slack bot to list and use prompt templates
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { integrationId } = await request.json();

    // Get the Slack integration from the database
    const integration = integrationId
      ? await db.query.integrations.findFirst({
          where: (integrations, { eq }) => eq(integrations.id, integrationId),
        })
      : await db.query.integrations.findFirst({
          where: (integrations, { eq, and }) =>
            and(
              eq(integrations.type, "slack"),
              eq(integrations.isActive, true)
            ),
        });

    if (!integration) {
      return NextResponse.json(
        { error: "Slack integration not found" },
        { status: 404 }
      );
    }

    // Get the user's templates
    const userTemplates = await db.query.promptTemplates.findMany({
      where: (templates, { eq, or, and }) =>
        or(
          eq(templates.userId, integration.userId),
          and(
            eq(templates.isPublic, true),
            // Add null check for organizationId
            integration.organizationId 
              ? eq(templates.organizationId, integration.organizationId)
              : eq(templates.isPublic, true) // Fallback condition if organizationId is null
          )
        ),
      orderBy: (templates, { desc }) => [desc(templates.updatedAt)],
      limit: 10,
    });

    if (userTemplates.length === 0) {
      return NextResponse.json({
        response_type: "ephemeral",
        text:
          "You don't have any prompt templates yet. Create one at " +
          `${process.env.NEXT_PUBLIC_APP_URL}/chat-templates/new`,
      });
    }

    // Format the templates for Slack
    const blocks: SlackBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Your Prompt Templates*",
        },
      },
      {
        type: "divider",
      },
    ];

    // Add each template as a section with a button
    userTemplates.forEach((template) => {
      blocks.push(
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${template.name}*\n${
              template.description || "No description"
            }`,
          },
          accessory: {
            type: "button",
            text: {
              type: "plain_text",
              text: "Use Template",
              emoji: true,
            },
            value: template.id,
            action_id: "use_template",
          },
        },
        {
          type: "divider",
        }
      );
    });

    // Add a link to view all templates
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${process.env.NEXT_PUBLIC_APP_URL}/chat-templates|View all templates>`,
      },
    });

    return NextResponse.json({
      response_type: "ephemeral",
      blocks,
    });
  } catch (error) {
    console.error("Slack templates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests for Slack templates commands
 * This is just a placeholder to satisfy the route handler requirements
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ message: "Use POST to list templates" });
}
