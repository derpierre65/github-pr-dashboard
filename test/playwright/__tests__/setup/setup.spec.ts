import { test, expect } from '@playwright/test';

test('should redirect to setup page and setup title should be visible', async({ page, }) => {
  await page.goto('/');

  // wait for redirect to /setup for new users
  await page.waitForURL('/setup');

  await expect(page.getByTestId('setup-title')).toHaveText('Welcome to GitHub Pull Request Dashboard');
});

test('should fail with an invalid token', async({ page, }) => {
  await page.goto('/setup');
  await page.getByTestId('setup-token').fill('my-invalid-token');
  await page.getByTestId('setup-login').click();
  await expect(page.getByText('Your token is invalid')).toBeVisible();
});

test('should succeed with a "valid" token and redirected to dashboard', async({ page, }) => {
  await page.goto('/setup');
  await page.route('https://api.github.com/user', async(route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        id: 42,
        login: 'derpierre65',
        type: 'User',
      }),
    });
  });
  await page.getByTestId('setup-token').fill('my-dummy-token');
  await page.getByTestId('setup-login').click();
  await expect(page.getByTestId('setup-title')).toBeHidden();
  await page.waitForURL('/');
});
