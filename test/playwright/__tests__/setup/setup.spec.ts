import { test, expect } from '@playwright/test';

test('should redirect to setup page and setup title should be visible', async({ page, }) => {
  await page.goto('/');
  await expect(page.getByTestId('setup-title')).toHaveText('Welcome to GitHub Pull Request Dashboard');
  await expect(page).toHaveURL('/setup');
});
