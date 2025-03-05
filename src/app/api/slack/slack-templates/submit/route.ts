import { NextRequest, NextResponse } from "next/server";
import { createSlackIntegration } from "@/lib/integrations/slack";
import { db } from "@/lib/db";
import { OpenAI } from "openai";

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Handle POST requests for submitting template variables through Slack
 * This endpoint will be called when a user submits the variable values for a template
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const {
      templateId,
      variables,
      userId,
      channelId,
      threadTs,
      responseUrl,
      integrationId,
    } = await request.json();

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    if (!variables || typeof variables !== "object") {
      return NextResponse.json(
        { error: "Variables must be an object" },
        { status: 400 }
      );
    }

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

    // Get the template from the database
    // First try to find a template owned by the user
    let template = userId 
      ? await db.query.promptTemplates.findFirst({
          where: (templates, { eq, and }) => 
            and(
              eq(templates.id, templateId),
              eq(templates.userId, userId)
            ),
        })
      : null;
    
    // If not found, look for a public template
    if (!template) {
      template = await db.query.promptTemplates.findFirst({
        where: (templates, { eq, and }) => 
          and(
            eq(templates.id, templateId),
            eq(templates.isPublic, true)
          ),
      });
    }

    if (!template) {
      return NextResponse.json(
        { error: "Template not found or you don't have access to it" },
        { status: 404 }
      );
    }

    // Cast the config to the expected type
    const config = integration.config as Record<string, unknown>;

    // Create a Slack integration instance
    const slack = createSlackIntegration({
      clientId: process.env.SLACK_CLIENT_ID || "",
      clientSecret: process.env.SLACK_CLIENT_SECRET || "",
      signingSecret: process.env.SLACK_SIGNING_SECRET || "",
      scopes: [
        'chat:write',
        'channels:read',
        'users:read',
        'team:read',
        'chat:write.public',
        'incoming-webhook',
      ],
      accessToken: config.access_token as string,
      refreshToken: config.refresh_token as string,
      expiresAt: config.expires_at as number,
      teamId: config.team_id as string,
      teamName: config.team_name as string,
      botUserId: config.bot_user_id as string,
      webhookUrl: config.webhook_url as string,
    });

    // Replace variables in the template content
    let content = template.content;

    Object.entries(variables).forEach(([name, value]) => {
      content = content.replace(
        new RegExp(`{{${name}}}`, "g"),
        value as string
      );
    });

    // Send a message to acknowledge the request
    await slack.sendMessage({
      channel: channelId,
      text: `Using template: *${template.name}*`,
      thread_ts: threadTs,
    });

    // Generate a response using OpenAI with the template
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant integrated with Slack. Provide concise, accurate responses to user queries. Format your responses using Slack markdown when appropriate.",
        },
        {
          role: "user",
          content,
        },
      ],
      temperature: 0.7,
    });

    // Send the response back to Slack
    await slack.sendMessage({
      channel: channelId,
      text: response.choices[0].message.content || "No response generated",
      thread_ts: threadTs,
    });

    // If responseUrl is provided, send a follow-up message
    if (responseUrl) {
      await fetch(responseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Template processed successfully!',
          replace_original: false,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Slack template submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle GET requests for Slack template variable submissions
 * This is just a placeholder to satisfy the route handler requirements
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: "Use POST to submit template variables",
  });
}
