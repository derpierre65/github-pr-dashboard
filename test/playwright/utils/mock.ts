import { Page } from '@playwright/test';

async function mockUser(page: Page, id = 42, login = 'derpierre65') {
  await mockGithubUrl(page, 'user', {
    id,
    login,
    type: 'User',
  });
}

async function mockGithubUrl(page: Page, url: string, response: object, responseStatus = 200) {
  await page.route(`https://api.github.com/${url}`, async(route) => {
    await route.fulfill({
      status: responseStatus,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}
async function mockGithubGraphql(page: Page, expects: string | string[], response: object, responseStatus = 200) {
  await page.route('https://api.github.com/graphql', async(route, request) => {
    const json = JSON.parse(request.postData() || '{}');
    if (!json.query) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'No query provided',
        }),
      });
      return;
    }

    for (const expect of Array.isArray(expects) ? expects : [ expects, ]) {
      if (!json.query.includes(expect)) {
        await route.fallback();
        return;
      }
    }

    await route.fulfill({
      status: responseStatus,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

export {
  mockUser,
  mockGithubUrl,
  mockGithubGraphql,
};
