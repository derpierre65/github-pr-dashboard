import { expect, test } from '@playwright/test';
import path from 'path';

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

  await page.context().storageState({
    path: path.join(process.cwd(), 'test/playwright/.auth/user.json'),
  });
});
