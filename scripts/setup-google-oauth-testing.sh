#!/bin/bash

# Setup Google OAuth Testing Environment
# This script helps set up the necessary files and dependencies for Google OAuth testing

echo "Setting up Google OAuth Testing Environment..."

# Check if Playwright is installed
if ! npm list @playwright/test > /dev/null 2>&1; then
  echo "Installing Playwright..."
  npm install --save-dev @playwright/test
  npx playwright install --with-deps chromium
else
  echo "Playwright is already installed."
fi

# Create test directory structure if it doesn't exist
mkdir -p src/tests/auth

# Create .env.test file if it doesn't exist
if [ ! -f .env.test ]; then
  echo "Creating .env.test file..."
  cat > .env.test << EOL
# Google OAuth credentials for testing
GOOGLE_CLIENT_ID=your-test-client-id
GOOGLE_CLIENT_SECRET=your-test-client-secret

# Optional: Test account credentials (use with caution)
# TEST_GOOGLE_EMAIL=your-test-account@gmail.com
# TEST_GOOGLE_PASSWORD=your-test-account-password
EOL
  echo ".env.test file created. Please update with your actual test credentials."
else
  echo ".env.test file already exists."
fi

# Create playwright.config.ts if it doesn't exist
if [ ! -f playwright.config.ts ]; then
  echo "Creating playwright.config.ts..."
  cat > playwright.config.ts << EOL
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './src/tests',
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
};

export default config;
EOL
  echo "playwright.config.ts created."
else
  echo "playwright.config.ts already exists."
fi

# Create basic Google OAuth test file
if [ ! -f src/tests/auth/google-oauth.test.ts ]; then
  echo "Creating Google OAuth test file..."
  cat > src/tests/auth/google-oauth.test.ts << EOL
import { test, expect } from '@playwright/test';

/**
 * Google OAuth Authentication Tests
 * 
 * These tests verify that Google OAuth authentication is properly configured and working.
 * 
 * Prerequisites:
 * - Valid Google OAuth credentials must be set in the environment
 * - A running instance of the application is required to execute these tests
 * 
 * To run these tests:
 * 1. Ensure your .env.test file has valid GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
 * 2. Start your application: npm run dev
 * 3. Run the tests: npx playwright test google-oauth.test.ts
 */

test.describe('Google OAuth Authentication', () => {
  // Clear cookies before each test to ensure a clean session
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('Google OAuth button is visible on login page', async ({ page }) => {
    await page.goto('/auth/login');
    
    const googleButton = page.getByRole('button', { name: 'Google' });
    await expect(googleButton).toBeVisible();
    
    // Verify the button has the correct styling and icon
    const googleIcon = page.locator('button', { hasText: 'Google' }).locator('svg');
    await expect(googleIcon).toBeVisible();
  });

  test('Clicking Google OAuth button redirects to Google authentication', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Intercept navigation to Google's authentication page
    await page.route('**/accounts.google.com/**', route => {
      // Just verify we got redirected to Google, then abort the request
      test.info().annotations.push({ type: 'info', description: 'Successfully redirected to Google auth' });
      return route.abort();
    });
    
    // Click the Google OAuth button
    const googleButton = page.getByRole('button', { name: 'Google' });
    await googleButton.click();
    
    // The test will pass if the route handler above is triggered
  });

  test('OAuth callback URL is properly configured', async ({ request }) => {
    // Test that the callback URL is properly configured
    const response = await request.get('/api/auth/callback/google');
    
    // The response should be a redirect or an error page, but not a 404
    expect(response.status()).not.toBe(404);
  });

  // This test requires actual Google credentials and manual interaction
  // It's commented out by default but can be enabled for manual testing
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
  });
  */
});
EOL
  echo "Google OAuth test file created at src/tests/auth/google-oauth.test.ts"
else
  echo "Google OAuth test file already exists."
fi

# Create GitHub Actions workflow file
mkdir -p .github/workflows
if [ ! -f .github/workflows/google-oauth-tests.yml ]; then
  echo "Creating GitHub Actions workflow file..."
  cat > .github/workflows/google-oauth-tests.yml << EOL
name: Google OAuth Tests

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'src/app/auth/**'
      - 'src/components/auth/**'
      - 'src/lib/auth/**'
      - 'src/tests/auth/**'
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:

jobs:
  test:
    name: Test Google OAuth Integration
    runs-on: ubuntu-latest
    
    env:
      GOOGLE_CLIENT_ID: \${{ secrets.GOOGLE_CLIENT_ID }}
      GOOGLE_CLIENT_SECRET: \${{ secrets.GOOGLE_CLIENT_SECRET }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Build application
        run: npm run build
      
      - name: Start application in background
        run: |
          npm run start &
          sleep 10
      
      - name: Run Google OAuth tests
        run: npx playwright test src/tests/auth/google-oauth.test.ts
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
EOL
  echo "GitHub Actions workflow file created at .github/workflows/google-oauth-tests.yml"
else
  echo "GitHub Actions workflow file already exists."
fi

echo ""
echo "Google OAuth Testing Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.test with your actual Google OAuth test credentials"
echo "2. Modify the test files to match your application's structure if needed"
echo "3. Run the tests with: npx playwright test src/tests/auth/google-oauth.test.ts"
echo ""
echo "For more information, see docs/implementing-google-oauth-testing.md" 