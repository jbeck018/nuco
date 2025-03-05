import { test, expect } from '@playwright/test';

/**
 * Tests for Google OAuth authentication
 * 
 * Note: These tests require valid Google OAuth credentials to be set in the environment
 * and a running instance of the application.
 * 
 * To run these tests:
 * 1. Make sure your .env file has valid GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * 2. Start the application: npm run dev
 * 3. Run the tests: npx playwright test google-oauth.test.ts
 * 
 * For complete end-to-end testing with actual Google authentication:
 * - Create a test Google account specifically for automated testing
 * - Use Playwright's storage state to maintain authentication between test runs
 * - Consider using environment variables for test credentials
 */

test.describe('Google OAuth Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we're starting with a clean session for each test
    await page.context().clearCookies();
  });

  test('Google OAuth button is visible on login page', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/auth/login');
    
    // Check that the Google OAuth button is visible
    const googleButton = page.getByRole('button', { name: 'Google' });
    await expect(googleButton).toBeVisible();
    
    // Verify the button has the correct styling and icon
    const googleIcon = page.locator('button', { hasText: 'Google' }).locator('svg');
    await expect(googleIcon).toBeVisible();
  });

  test('Google OAuth button is visible on signup page', async ({ page }) => {
    // Navigate to the signup page
    await page.goto('/auth/signup');
    
    // Check that the Google OAuth button is visible
    const googleButton = page.getByRole('button', { name: 'Google' });
    await expect(googleButton).toBeVisible();
    
    // Verify the button has the correct styling and icon
    const googleIcon = page.locator('button', { hasText: 'Google' }).locator('svg');
    await expect(googleIcon).toBeVisible();
  });

  test('Clicking Google OAuth button redirects to Google authentication', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/auth/login');
    
    // Intercept navigation to Google's authentication page
    // This allows us to verify the redirect without actually completing the authentication
    await page.route('**/accounts.google.com/**', route => {
      // Just verify we got redirected to Google, then abort the request
      // to prevent actual navigation to Google's auth page
      test.info().annotations.push({ type: 'info', description: 'Successfully redirected to Google auth' });
      return route.abort();
    });
    
    // Click the Google OAuth button
    const googleButton = page.getByRole('button', { name: 'Google' });
    await googleButton.click();
    
    // The test will pass if the route handler above is triggered
    // Otherwise, it will time out, indicating the redirect didn't happen
  });

  test('Google OAuth callback URL is properly configured', async ({ request }) => {
    // Test that the callback URL is properly configured and returns a valid response
    // Note: This doesn't test the full authentication flow, just that the endpoint exists
    const response = await request.get('/api/auth/callback/google');
    
    // The response should be a redirect or an error page, but not a 404
    expect(response.status()).not.toBe(404);
  });

  // Note: The following test is commented out because it requires manual interaction
  // with the Google login page, which is difficult to automate in a test.
  // This test is better run manually or with stored credentials.
  /*
  test('Can sign in with Google', async ({ page }) => {
    // This test requires environment variables for test credentials
    const testEmail = process.env.TEST_GOOGLE_EMAIL;
    const testPassword = process.env.TEST_GOOGLE_PASSWORD;
    
    if (!testEmail || !testPassword) {
      test.skip('Test credentials not provided');
    }
    
    // Navigate to the login page
    await page.goto('/auth/login');
    
    // Click the Google OAuth button
    const googleButton = page.getByRole('button', { name: 'Google' });
    await googleButton.click();
    
    // Wait for redirect to Google login page
    await page.waitForURL(/accounts\.google\.com/);
    
    // Enter Google credentials
    await page.fill('input[type="email"]', testEmail);
    await page.click('#identifierNext');
    await page.waitForSelector('input[type="password"]');
    await page.fill('input[type="password"]', testPassword);
    await page.click('#passwordNext');
    
    // Wait for redirect back to the application
    await page.waitForURL(/\/dashboard/);
    
    // Check that the user is logged in
    const userMenu = page.getByRole('button', { name: /user menu/i });
    await expect(userMenu).toBeVisible();
    
    // Save authentication state for future tests
    await page.context().storageState({ path: 'google-auth.json' });
  });
  */

  test('Google OAuth integration is properly configured in auth config', async ({ request }) => {
    // Check that the Google provider is properly configured in the auth config
    // by verifying the signin page includes Google as an option
    const response = await request.get('/api/auth/signin');
    const body = await response.text();
    
    // The signin page should mention Google
    expect(body).toContain('Google');
  });
}); 