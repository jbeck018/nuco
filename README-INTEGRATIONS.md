# Third-Party Integrations Setup for Nuco-App

This document provides instructions for setting up third-party integrations in Nuco-App, including Salesforce, HubSpot, Google, and Slack.

## Overview

Nuco-App supports integrations with various third-party services to enhance functionality and provide a seamless experience for users. These integrations allow organizations to connect their existing tools and workflows with Nuco-App.

## Prerequisites

Before setting up integrations, ensure you have:

1. A running instance of Nuco-App
2. Admin access to your organization in Nuco-App
3. Developer accounts for the services you want to integrate
4. Proper environment variables configured in your `.env` file

## Salesforce Integration

### Setup in Salesforce

1. Log in to [Salesforce](https://login.salesforce.com/)
2. Navigate to Setup > Apps > App Manager
3. Click "New Connected App"
4. Fill in the required fields:
   - Connected App Name: Nuco-App
   - API Name: Nuco_App
   - Contact Email: your email
5. Enable OAuth Settings
6. Set the callback URL: `https://your-app-domain.com/api/integrations/salesforce/callback`
7. Select the required OAuth scopes:
   - `api` (Access and manage your data)
   - `refresh_token, offline_access` (Perform requests on your behalf at any time)
   - Add any additional scopes based on your specific needs
8. Save the app
9. Note your Consumer Key (Client ID) and Consumer Secret (Client Secret)

### Environment Variables

Add the following to your `.env` file:

```
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret
SALESFORCE_URL=https://login.salesforce.com
```

For sandbox environments, use `https://test.salesforce.com` as the `SALESFORCE_URL`.

## HubSpot Integration

### Setup in HubSpot

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create a new app or select an existing one
3. Navigate to the "Auth" tab
4. Set the Redirect URL: `https://your-app-domain.com/api/integrations/hubspot/callback`
5. Select the required scopes based on your needs:
   - `contacts` - to access contact information
   - `crm.objects.contacts.read` - to read contact data
   - `crm.objects.contacts.write` - to write contact data
   - Add any additional scopes based on your specific needs
6. Note your Client ID and Client Secret

### Environment Variables

Add the following to your `.env` file:

```
HUBSPOT_CLIENT_ID=your-hubspot-client-id
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
```

## Google Integration

### Setup in Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add your app's URL to "Authorized JavaScript origins" (e.g., `https://your-app-domain.com`)
7. Add your callback URL to "Authorized redirect URIs" (e.g., `https://your-app-domain.com/api/integrations/google/callback`)
8. Click "Create" and note your Client ID and Client Secret
9. Enable the APIs you need (e.g., Google Calendar API, Google Drive API, Gmail API)

### Environment Variables

Add the following to your `.env` file:

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Slack Integration

### Setup in Slack API

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app or select an existing one
3. Navigate to "OAuth & Permissions"
4. Add Redirect URLs: `https://your-app-domain.com/api/integrations/slack/callback`
5. Under "Bot Token Scopes", add the required scopes:
   - `chat:write` - to send messages
   - `channels:read` - to view channels
   - `users:read` - to view users
   - Add any additional scopes based on your specific needs
6. Install the app to your workspace
7. Note your Client ID, Client Secret, and Signing Secret

### Environment Variables

Add the following to your `.env` file:

```
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret
```

## Using Integrations in Nuco-App

### Connecting an Integration

1. Log in to Nuco-App
2. Navigate to your organization settings
3. Go to the "Integrations" tab
4. Select the integration you want to connect
5. Click "Connect" and follow the authorization flow
6. Grant the necessary permissions

### Managing Integrations

1. View connected integrations in the "Integrations" tab
2. Disconnect integrations by clicking "Disconnect"
3. Update integration settings as needed

## Integration Limits

Integration limits depend on your organization's subscription plan:

- **Free Plan**: 1 integration
- **Starter Plan**: 3 integrations
- **Pro Plan**: 10 integrations
- **Enterprise Plan**: 50 integrations

## Troubleshooting

### Common Issues

1. **Authorization Errors**: Ensure your Client ID and Client Secret are correct and that you've selected the appropriate scopes.

2. **Callback URL Errors**: Verify that the callback URLs in your integration provider settings exactly match the URLs in your application.

3. **Rate Limiting**: Be aware of rate limits imposed by the integration providers. Implement appropriate retry logic and backoff strategies.

4. **Token Expiration**: Handle token refresh flows properly to maintain continuous access to integrated services.

### Debugging

To debug integration issues:

1. Check the application logs for error messages
2. Verify environment variables are correctly set
3. Ensure the integration provider's services are operational
4. Test the integration with minimal permissions first, then add more as needed

## Security Considerations

1. **Data Privacy**: Be mindful of what data is shared between Nuco-App and integrated services.

2. **Token Storage**: Ensure that access tokens and refresh tokens are securely stored.

3. **Scope Minimization**: Request only the minimum scopes needed for your integration to function.

4. **Regular Audits**: Periodically review connected integrations and remove any that are no longer needed.

## Resources

- [Salesforce API Documentation](https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_what_is_rest_api.htm)
- [HubSpot API Documentation](https://developers.hubspot.com/docs/api/overview)
- [Google API Documentation](https://developers.google.com/apis-explorer)
- [Slack API Documentation](https://api.slack.com/docs) 