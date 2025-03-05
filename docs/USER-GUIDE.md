# User Guide

## Metadata and User Preferences

Nuco provides a flexible metadata storage system that stores user preferences, organization settings, and integration-specific configurations. This system ensures a personalized experience for each user while maintaining organization-wide consistency when needed.

### User Preferences

User preferences are stored for each user and include settings such as:

- **Theme**: Choose between light, dark, or system theme
- **Timezone**: Set your preferred timezone for date/time display
- **Locale**: Set your preferred language and region format
- **Notifications**: Configure how and when you receive notifications
- **UI Customization**: Personalize your experience with settings for font size, accent color, and compact mode

You can access your user preferences in the "Settings" section of your user profile. Changes to these settings are applied immediately with optimistic updates, meaning you'll see the changes right away while they're being saved in the background.

### Organization Settings

Organization administrators can configure various settings that apply to all members:

- **Default Member Role**: Set the default role assigned to new members
- **Default Integrations**: Choose which integrations are enabled by default
- **Slack Integration**: Configure Slack webhook and notification settings

These settings can be found in the "Settings" tab of your organization dashboard. Only users with administrative access can modify organization settings.

### Integration Settings

Each integration can have its own settings, which include:

- **Sync Frequency**: How often data should be synchronized
- **Sync Settings**: Configure which fields to sync and in which direction
- **API Settings**: Set rate limits, timeouts, and retry policies

Integration settings can be accessed from the "Integrations" section in your organization dashboard.

## Working with Settings

### Theme Switching

The theme setting controls the appearance of the application:

1. Click on your profile icon in the top right corner
2. Select "Settings" from the dropdown menu
3. In the "Appearance" section, choose your preferred theme:
   - Light: Always use light mode
   - Dark: Always use dark mode
   - System: Follow your system preferences

### Notification Preferences

Customize how you receive notifications:

1. Navigate to Settings > Notifications
2. Toggle on/off different notification types:
   - Email notifications
   - In-app notifications
   - Slack messages (if Slack integration is enabled)
   - Marketing emails

### Organization-wide Settings

If you're an organization administrator, you can configure settings that apply to all members:

1. Go to your organization dashboard
2. Click on "Settings" in the sidebar
3. In the "General" tab, you can:
   - Set the default role for new members
   - Configure default integrations
   - Set up Slack notifications

### Integration Configuration

Each integration has its own configuration:

1. Navigate to the "Integrations" section
2. Select the integration you want to configure
3. Adjust settings such as:
   - Sync frequency
   - Field mapping
   - Conflict resolution strategy

Changes to integration settings take effect on the next synchronization cycle.

## Advanced Settings

### API Settings

For more technical users, API settings provide control over how integrations behave:

1. Go to the integration's settings page
2. Click on "Advanced Settings"
3. Configure:
   - API rate limits
   - Request timeouts
   - Retry policies
   - Custom API endpoints (if supported)

### Custom Fields

Some integrations support mapping custom fields:

1. In the integration settings, navigate to the "Field Mapping" section
2. Map standard Nuco fields to your integration's fields
3. For custom fields, use the "Add Custom Field" button to create new mappings

## Troubleshooting

If you encounter issues with your settings:

1. **Settings not saving**: Check your network connection and try again
2. **Settings not taking effect**: Try refreshing the page or logging out and back in
3. **Integration sync issues**: Verify your API credentials and check the integration logs
4. **Permission errors**: Ensure you have the correct role for the action you're trying to perform

For further assistance, contact support through the help icon in the bottom right corner of the application. 