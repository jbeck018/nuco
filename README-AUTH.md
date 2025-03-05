# Authentication Setup for Nuco-App

This document provides instructions for setting up authentication in Nuco-App, including NextAuth configuration, email/password authentication, and OAuth providers.

## NextAuth Setup

### 1. Environment Variables

Add the following to your `.env` file:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

For production, set `NEXTAUTH_URL` to your production URL and generate a secure random string for `NEXTAUTH_SECRET`.

To generate a secure secret, you can use:
```bash
openssl rand -base64 32
```

### 2. Email/Password Authentication

To enable email/password authentication, add the following to your `.env` file:

```
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=user@example.com
EMAIL_SERVER_PASSWORD=password
EMAIL_FROM=noreply@example.com
```

Replace the values with your SMTP server details. This is used for:
- Sending verification emails
- Password reset emails
- Email-based sign-in links

### 3. Database Configuration

Ensure your database is properly configured in `.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nuco
```

NextAuth uses this database to store:
- User accounts
- Sessions
- Verification tokens

## OAuth Providers

### Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application" as the application type
6. Add your app's URL to "Authorized JavaScript origins" (e.g., `http://localhost:3000`)
7. Add your callback URL to "Authorized redirect URIs" (e.g., `http://localhost:3000/api/auth/callback/google`)
8. Click "Create" and note your Client ID and Client Secret
9. Add to your `.env` file:

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Salesforce OAuth

1. Log in to [Salesforce](https://login.salesforce.com/)
2. Navigate to Setup > Apps > App Manager
3. Click "New Connected App"
4. Fill in the required fields:
   - Connected App Name: Nuco-App
   - API Name: Nuco_App
   - Contact Email: your email
5. Enable OAuth Settings
6. Set the callback URL (e.g., `http://localhost:3000/api/auth/callback/salesforce`)
7. Select the required OAuth scopes (typically "Access and manage your data" and "Perform requests on your behalf at any time")
8. Save and note your Consumer Key (Client ID) and Consumer Secret (Client Secret)
9. Add to your `.env` file:

```
SALESFORCE_CLIENT_ID=your-salesforce-client-id
SALESFORCE_CLIENT_SECRET=your-salesforce-client-secret
SALESFORCE_URL=https://login.salesforce.com
```

### HubSpot OAuth

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create or select an app
3. Navigate to "Auth" tab
4. Set the Redirect URL (e.g., `http://localhost:3000/api/auth/callback/hubspot`)
5. Note your Client ID and Client Secret
6. Add to your `.env` file:

```
HUBSPOT_CLIENT_ID=your-hubspot-client-id
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
```

### Slack OAuth

1. Go to [Slack API](https://api.slack.com/apps)
2. Create a new app or select an existing one
3. Navigate to "OAuth & Permissions"
4. Add Redirect URLs (e.g., `http://localhost:3000/api/auth/callback/slack`)
5. Under "Bot Token Scopes", add the required scopes (e.g., `chat:write`, `channels:read`)
6. Install the app to your workspace
7. Note your Client ID, Client Secret, and Signing Secret
8. Add to your `.env` file:

```
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_SIGNING_SECRET=your-slack-signing-secret
```

## Testing Authentication

1. Start your application
2. Navigate to the sign-in page
3. Test each authentication method:
   - Email/password sign-in
   - OAuth providers (Google, Salesforce, HubSpot, Slack)
4. Verify that users can:
   - Sign up
   - Sign in
   - Sign out
   - Reset password (if applicable)

## Troubleshooting

### Common Issues

1. **Callback URL Mismatch**: Ensure the callback URLs in your OAuth provider settings exactly match the URLs in your application.

2. **CORS Errors**: If you're getting CORS errors, check that your `NEXTAUTH_URL` is correctly set and that your OAuth providers have the correct origins configured.

3. **Database Connection Issues**: Verify your database connection string and ensure the database is running.

4. **Email Configuration**: If email verification isn't working, check your SMTP settings and ensure your email provider allows the connection.

### Debug Mode

To enable debug mode for NextAuth, add the following to your `.env` file:

```
NEXTAUTH_DEBUG=true
```

This will output detailed logs to help diagnose authentication issues.

## Resources

- [NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Salesforce OAuth Documentation](https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm)
- [HubSpot OAuth Documentation](https://developers.hubspot.com/docs/api/oauth-quickstart)
- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2) 