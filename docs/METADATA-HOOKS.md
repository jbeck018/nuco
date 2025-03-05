# Metadata Hooks Documentation

This document provides information about the metadata hooks available in the Nuco App for managing user preferences, organization settings, and integration settings.

## Overview

Nuco App includes a set of hooks for managing various types of settings and preferences with optimistic UI updates. These hooks provide a convenient interface for reading and updating settings, with built-in error handling and toast notifications.

## Available Hooks

- `useUserPreferences`: Manages user-specific preferences
- `useOrganizationSettings`: Manages organization-level settings
- `useIntegrationSettings`: Manages integration-specific settings

## useUserPreferences

A hook for managing user preferences with optimistic updates.

### Usage

```tsx
import { useUserPreferences } from '@/hooks/useUserPreferences';

function UserSettingsPage() {
  const {
    // Data
    preferences,
    isLoading,
    error,
    
    // Update methods
    setTheme,
    setTimezone,
    setLocale,
    setNotifications,
    
    // Computed properties
    theme,
    timezone,
    locale,
    notifications,
    customization,
    fontSize,
    accentColor,
    compactMode,
  } = useUserPreferences();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>User Preferences</h1>
      
      <div>
        <label>Theme</label>
        <select 
          value={theme} 
          onChange={e => setTheme(e.target.value as 'light' | 'dark' | 'system')}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>
      
      {/* More preference controls */}
    </div>
  );
}
```

### API

#### Data
- `preferences`: The complete user preferences object
- `isLoading`: Boolean indicating if preferences are being loaded
- `error`: Error object if the request failed
- `isUpdating`: Boolean indicating if an update is in progress

#### Methods
- `updatePreferences(data)`: Update multiple preferences at once
- `setTheme(theme)`: Set the UI theme ('light', 'dark', 'system')
- `setTimezone(timezone)`: Set the user's timezone
- `setLocale(locale)`: Set the user's locale
- `setNotifications(notifications)`: Update notification settings
- `setCustomization(customization)`: Update UI customization settings
- `setFontSize(fontSize)`: Set the font size ('small', 'medium', 'large')
- `setAccentColor(color)`: Set the accent color
- `setCompactMode(enabled)`: Enable/disable compact mode

#### Computed Properties
- `theme`: Current theme preference
- `timezone`: Current timezone
- `locale`: Current locale
- `notifications`: Current notification settings
- `customization`: Current UI customization settings
- `fontSize`: Current font size
- `accentColor`: Current accent color
- `compactMode`: Whether compact mode is enabled

## useOrganizationSettings

A hook for managing organization settings with optimistic updates.

### Usage

```tsx
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings';

function OrganizationSettingsPage({ organizationId }) {
  const {
    // Data
    settings,
    isLoading,
    error,
    
    // Update methods
    setMemberDefaultRole,
    setDefaultIntegrations,
    setSlackSettings,
    
    // Computed properties
    memberDefaultRole,
    defaultIntegrations,
    slackSettings,
    hasSlackIntegration,
  } = useOrganizationSettings(organizationId);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>Organization Settings</h1>
      
      <div>
        <label>Default Role for New Members</label>
        <select 
          value={memberDefaultRole} 
          onChange={e => setMemberDefaultRole(e.target.value)}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      
      {/* More settings controls */}
    </div>
  );
}
```

### API

#### Data
- `settings`: The complete organization settings object
- `isLoading`: Boolean indicating if settings are being loaded
- `error`: Error object if the request failed
- `isUpdating`: Boolean indicating if an update is in progress

#### Methods
- `updateSettings(data)`: Update multiple settings at once
- `setMemberDefaultRole(role)`: Set the default role for new members
- `setDefaultIntegrations(integrations)`: Set the default integrations
- `setSlackSettings(settings)`: Update Slack integration settings
- `enableSlackNotifications(type, enabled)`: Enable/disable specific Slack notifications
- `setSlackWebhookUrl(url)`: Set the Slack webhook URL

#### Computed Properties
- `memberDefaultRole`: Current default role for new members
- `defaultIntegrations`: Current default integrations
- `slackSettings`: Current Slack integration settings
- `hasSlackIntegration`: Whether Slack integration is configured

## useIntegrationSettings

A hook for managing integration-specific settings with optimistic updates.

### Usage

```tsx
import { useIntegrationSettings } from '@/hooks/useIntegrationSettings';

function IntegrationSettingsPage({ integrationId }) {
  const {
    // Data
    settings,
    isLoading,
    error,
    
    // Update methods
    setSyncFrequency,
    setSyncSettings,
    setApiSettings,
    setSyncDirection,
    
    // Computed properties
    syncFrequency,
    syncSettings,
    apiSettings,
  } = useIntegrationSettings(integrationId);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>Integration Settings</h1>
      
      <div>
        <label>Sync Frequency (minutes)</label>
        <input 
          type="number" 
          value={syncFrequency} 
          onChange={e => setSyncFrequency(parseInt(e.target.value))}
          min="5"
          max="1440"
        />
      </div>
      
      <div>
        <label>Sync Direction</label>
        <select 
          value={syncSettings.syncDirection} 
          onChange={e => setSyncDirection(e.target.value as 'oneway' | 'bidirectional')}
        >
          <option value="oneway">One-way (Nuco → Integration)</option>
          <option value="bidirectional">Bidirectional</option>
        </select>
      </div>
      
      {/* More settings controls */}
    </div>
  );
}
```

### API

#### Data
- `settings`: The complete integration settings object
- `isLoading`: Boolean indicating if settings are being loaded
- `error`: Error object if the request failed
- `isUpdating`: Boolean indicating if an update is in progress

#### Methods
- `updateSettings(data)`: Update multiple settings at once
- `setSyncFrequency(frequency)`: Set the sync frequency in minutes
- `setSyncSettings(settings)`: Update sync settings
- `setApiSettings(settings)`: Update API settings
- `setFields(fields)`: Set the fields to sync
- `setExcludedFields(fields)`: Set the fields to exclude from sync
- `setSyncDirection(direction)`: Set the sync direction
- `setConflictResolution(strategy)`: Set the conflict resolution strategy

#### Computed Properties
- `syncFrequency`: Current sync frequency in minutes
- `syncSettings`: Current sync settings
- `apiSettings`: Current API settings

## Implementation Details

These hooks are built on top of the `useOptimisticMutation` hook, which provides optimistic UI updates for a better user experience. When a setting is updated, the UI is updated immediately, and the changes are sent to the server in the background.

If the server update fails, the UI is automatically rolled back to the previous state, and an error toast is displayed. On success, a success toast is displayed to confirm the changes. 