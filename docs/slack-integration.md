# Slack Integration

## Overview

The Nuco Slack integration allows users to interact with the Nuco AI assistant directly from Slack. This integration provides a seamless way to access AI capabilities and prompt templates without leaving your Slack workspace.

## Features

### OAuth Authentication

- Secure OAuth 2.0 authentication flow
- Token management with automatic refresh
- Integration with the Nuco organization system

### Bot Functionality

- Event handling for messages and mentions
- Slash commands for easy access to Nuco features
- Interactive components for rich user interactions
- Template integration for using prompt templates in Slack

### Commands

The Nuco Slack bot supports the following slash commands:

- `/nuco help` - Display help information
- `/nuco chat [message]` - Chat with the AI assistant
- `/nuco templates` - List your available prompt templates

## Implementation Details

### API Endpoints

- `/api/slack/oauth/callback` - Handles the OAuth callback from Slack
- `/api/slack/bot` - Processes bot events and slash commands
- `/api/slack/chat` - Handles AI chat functionality
- `/api/slack/templates` - Lists available prompt templates
- `/api/slack/templates/use` - Uses a specific template
- `/api/slack/templates/submit` - Submits variable values for a template

### Security

- Request signature verification using Slack's signing secret
- Secure token storage in the database
- Rate limiting to prevent abuse

### Integration with Prompt Templates

The Slack integration allows users to:

1. List their available prompt templates
2. Select a template to use
3. Fill in template variables if needed
4. Get AI-generated responses based on the template

## Setup Instructions

### Prerequisites

- A Slack workspace where you have permission to add apps
- A Nuco account with API access

### Configuration

1. Create a new Slack app in the [Slack API Console](https://api.slack.com/apps)
2. Configure the following:
   - Bot Token Scopes: `chat:write`, `channels:read`, `users:read`, etc.
   - Event Subscriptions: Point to your `/api/slack/bot` endpoint
   - Slash Commands: Create a `/nuco` command pointing to your `/api/slack/bot` endpoint
   - OAuth & Permissions: Add your redirect URL as `/api/slack/oauth/callback`
3. Install the app to your workspace
4. In your Nuco account, go to Settings > Integrations and connect your Slack workspace

## Usage Examples

### Chatting with the AI

```
/nuco chat What's the weather like in San Francisco today?
```

### Using a Template

1. List templates:
```
/nuco templates
```

2. Click on "Use Template" for the desired template

3. If the template has variables, fill them in and submit

## Troubleshooting

- **Authentication Issues**: Ensure your Slack app has the correct scopes and your tokens are valid
- **Command Not Working**: Check that your slash command is correctly configured in the Slack API Console
- **Template Variables Not Working**: Verify that your template variables are correctly defined

## Future Enhancements

- Support for more interactive components
- Integration with Slack workflows
- Advanced template management directly from Slack
- Team-specific template recommendations 