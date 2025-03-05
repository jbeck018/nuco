# Setting up HubSpot OAuth

This guide explains how to set up HubSpot OAuth for your application.

## Prerequisites

- A HubSpot developer account
- Access to the HubSpot developer portal

## Steps to Set Up HubSpot OAuth

### 1. Create a HubSpot App

1. Go to the [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Sign in to your HubSpot account
3. Navigate to "Apps" in the top menu
4. Click "Create App"
5. Fill in the required information:
   - App Name: Your application name
   - Description: A brief description of your application
   - Logo: Upload your application logo (optional)

### 2. Configure OAuth Settings

1. In your app settings, navigate to the "Auth" tab
2. Set the following:
   - Redirect URL: `https://your-domain.com/api/auth/callback/hubspot` (for local development: `http://localhost:3000/api/auth/callback/hubspot`)
   - Scopes: Select the scopes your application needs (at minimum, you'll need `oauth` and `contacts`)

### 3. Get Your Client ID and Secret

1. After saving your OAuth settings, HubSpot will generate a Client ID and Client Secret
2. Copy these values as you'll need them for your application

### 4. Configure Environment Variables

Add the following variables to your `.env` file:

```
HUBSPOT_CLIENT_ID=your-hubspot-client-id
HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
```

Replace `your-hubspot-client-id` and `your-hubspot-client-secret` with the values from step 3.

### 5. Testing the Integration

1. Start your application
2. Navigate to the login page
3. Click the "HubSpot" button
4. You should be redirected to HubSpot's authorization page
5. After authorizing, you should be redirected back to your application and logged in

## Troubleshooting

- **Redirect URI Mismatch**: Ensure the redirect URI in your HubSpot app settings exactly matches the callback URL in your application
- **Scope Issues**: If you're getting permission errors, check that you've selected all the necessary scopes in your HubSpot app settings
- **Invalid Client**: Double-check that your Client ID and Client Secret are correctly set in your environment variables

## Additional Resources

- [HubSpot OAuth Documentation](https://developers.hubspot.com/docs/api/oauth-quickstart-guide)
- [NextAuth.js HubSpot Provider Documentation](https://next-auth.js.org/providers/hubspot) 