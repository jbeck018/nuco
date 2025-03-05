# Testing Google OAuth Authentication

This document provides comprehensive guidance on testing Google OAuth authentication in the Nuco-App.

## Overview

Testing OAuth authentication flows can be challenging due to their reliance on external services and the need for user interaction. This guide outlines different approaches to testing Google OAuth integration, from basic component tests to full end-to-end authentication flows.

## Test Types

### 1. Component and UI Tests

These tests verify that OAuth-related UI components are correctly rendered and functioning:

- Verify that Google OAuth buttons appear on login and signup pages
- Check that buttons have correct styling and icons
- Ensure that clicking the button initiates the OAuth flow

### 2. Integration Tests

These tests verify that the OAuth configuration is correct:

- Test that the OAuth callback URL is properly configured
- Verify that the Google provider is properly set up in the auth configuration
- Check that clicking the Google button redirects to Google's authentication page

### 3. End-to-End Authentication Tests

These tests verify the complete authentication flow:

- Test the full sign-in process with Google credentials
- Verify successful redirection back to the application
- Check that the user is properly authenticated after the flow completes

## Automated Testing Approaches

### Basic Approach (Implemented)

Our current test suite (`src/tests/auth/google-oauth.test.ts`) implements:

- UI tests to verify Google buttons are present
- A test to verify clicking the button redirects to Google
- A test to verify the callback URL is properly configured
- A test to verify Google is properly configured in the auth system

### Advanced Approach (For Future Implementation)

For more comprehensive testing, consider:

1. **Using Test Credentials**:
   - Create a dedicated Google test account
   - Store credentials in environment variables
   - Use these credentials to automate the full authentication flow

2. **Maintaining Authentication State**:
   - Use Playwright's `storageState` to save and reuse authentication state
   - This allows tests to run with an authenticated user without repeating the login flow

3. **Mocking Google OAuth**:
   - For unit and integration tests, consider mocking the Google OAuth provider
   - This allows testing the authentication logic without depending on external services

## Running the Tests

### Prerequisites

- Valid Google OAuth credentials configured in your `.env` file
- A running instance of the application

### Basic Tests

Run the basic tests with:

```bash
# Start the application
npm run dev

# In another terminal, run the tests
npx playwright test src/tests/auth/google-oauth.test.ts
```

### End-to-End Tests

To run end-to-end tests with actual Google authentication:

1. Set up environment variables for test credentials:
   ```
   TEST_GOOGLE_EMAIL=your-test-account@gmail.com
   TEST_GOOGLE_PASSWORD=your-test-password
   ```

2. Uncomment and modify the "Can sign in with Google" test in `google-oauth.test.ts`

3. Run the tests:
   ```bash
   npx playwright test src/tests/auth/google-oauth.test.ts
   ```

## Best Practices

1. **Security**:
   - Never commit test credentials to version control
   - Use environment variables or secure credential storage
   - Consider using a dedicated test account with limited permissions

2. **Test Isolation**:
   - Clear cookies and storage between tests
   - Use unique user identifiers for each test run
   - Reset test data after test completion

3. **Reliability**:
   - Add appropriate waits and assertions to handle asynchronous operations
   - Implement retry logic for flaky external services
   - Consider skipping full OAuth tests in CI environments

4. **Maintenance**:
   - Regularly update test credentials
   - Monitor for changes in Google's OAuth implementation
   - Keep tests focused on behavior, not implementation details

## Troubleshooting

### Common Issues

1. **Test Timeouts**:
   - Google's authentication page may take time to load
   - Increase test timeouts for OAuth-related tests

2. **Authentication Failures**:
   - Verify that test credentials are valid
   - Check that OAuth configuration is correct
   - Ensure redirect URIs match exactly

3. **CAPTCHA Challenges**:
   - Google may present CAPTCHA challenges for suspicious login attempts
   - Use a dedicated test account with reduced security settings
   - Consider implementing CAPTCHA detection and test skipping

## Future Improvements

1. **Visual Testing**:
   - Add visual regression tests for OAuth-related UI components
   - Verify that Google branding meets Google's requirements

2. **Performance Testing**:
   - Measure and optimize OAuth flow performance
   - Test under various network conditions

3. **Security Testing**:
   - Verify proper handling of OAuth errors
   - Test token refresh mechanisms
   - Validate secure storage of tokens

## References

- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Testing Guide](https://next-auth.js.org/guides/testing) 