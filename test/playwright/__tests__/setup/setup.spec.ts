import { test, expect } from '@playwright/test';

test('should redirect to setup page and setup title should be visible', async({ page, }) => {
  await page.goto('/');

  // wait for redirect to /setup for new users
  await page.waitForURL('/setup');

  await expect(page.getByTestId('setup-title')).toHaveText('Welcome to GitHub Pull Request Dashboard');
});
