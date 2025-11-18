import { test, expect, Page } from '@playwright/test';
import { mockGithubGraphql, mockUser } from 'app/test/playwright/utils/mock';

test.describe('repository management', () => {
  const notArchivedRepository = 'derpierre65/foo';
  const archivedRepository = 'derpierre65/bar';

  async function openCreateDialog(page: Page) {
    await mockUser(page);
    await mockGithubGraphql(page, [
      'repositoriesContributedTo',
      'includeUserRepositories: true',
    ], {
      data: {
        viewer: {
          repositoriesContributedTo: {
            nodes: [
              {
                nameWithOwner: notArchivedRepository,
                isArchived: false,
              },
              {
                nameWithOwner: archivedRepository,
                isArchived: true,
              },
            ],
          },
        },
      },
    });

    await page.goto('/');
    await page.getByTestId('repository-add').click();
    await page.getByTestId('dialog-repository-add').waitFor();
  }

  test.describe('basics', () => {
    test('should close the dialog', async({ page, }) => {
      await openCreateDialog(page);

      await page.getByTestId('dialog-repository-add-close').click();
      await expect(page.getByTestId('dialog-repository-add')).toBeHidden();
    });
  });

  test.describe('manual input', () => {
    const inputValue = 'derpierre65/foo';
    const [ owner, repository, ] = inputValue.split('/');

    function testAddRepositoryWithInput(confirm: (context: { page: Page; }) => Promise<void>) {
      return async({ page, }) => {
        await mockGithubGraphql(page, `repository(owner: "${owner}", name: "${repository}") {`, {
          data: {
            repository: {
              pullRequests: {
                pageInfo: {
                  hasNextPage: false,
                  hasPreviousPage: false,
                  startCursor: null,
                  endCursor: null,
                },
                nodes: [],
              },
            },
            rateLimit: {
              cost: 4,
              limit: 5000,
              remaining: 4996,
              used: 69,
              resetAt: new Date(),
            },
          },
        });

        await openCreateDialog(page);
        await page.getByTestId('dialog-repository-add').getByTestId('repository-name').fill(inputValue);
        await confirm({
          page,
        });
        await page.getByTestId('repository-list').getByTestId(`repository-${inputValue}`).waitFor();
        await page.getByTestId('dialog-repository-add').waitFor({
          state: 'hidden',
        });
      };
    }

    test('should be able to add a repository with input and Enter keyup event', testAddRepositoryWithInput(async({ page, }) => {
      await page.getByTestId('dialog-repository-add').getByTestId('repository-name').press('Enter');
    }));

    test('should be able to add a repository with input and submit button', testAddRepositoryWithInput(async({ page, }) => {
      await page.getByTestId('dialog-repository-add').getByTestId('button-add').click();
    }));

    test('should not be able to add a missing repository', async({ page, }) => {
      await mockGithubGraphql(page, `repository(owner: "${owner}", name: "${repository}") {`, {
        data: {
          repository: null,
          rateLimit: {
            cost: 4,
            limit: 5000,
            remaining: 4996,
            used: 69,
            resetAt: new Date(),
          },
        },
        errors: [
          {
            type: 'NOT_FOUND',
            message: `Could not resolve to a Repository with the name '${inputValue}'.`,
          },
        ],
      });

      await openCreateDialog(page);
      await page.getByTestId('dialog-repository-add').getByTestId('repository-name').fill(inputValue);
      await page.getByTestId('dialog-repository-add').getByTestId('button-add').click();
      await page.getByText('Could not resolve to a Repository with the name').waitFor();
    });
  });

  test.describe('suggestions', () => {
    test('should load suggested repositories', async({ page, }) => {
      await openCreateDialog(page);

      await expect(page.getByTestId('suggestion-list')).toBeVisible();
      await expect(page.getByTestId(`suggestion-${archivedRepository}-archived-icon`)).toBeVisible();
      expect(await page.getByTestId('suggestion-list').getByTestId('suggestion').count()).toBe(2);
    });

    test('should find repositories with search bar', async({ page, }) => {
      await openCreateDialog(page);

      const search = page.getByTestId('dialog-repository-add').getByTestId('suggestion-search');
      await expect(search).toBeVisible();

      // find 1 entry with search term 'bar'
      await search.fill('bar');
      expect(await page.getByTestId('suggestion-list').getByTestId('suggestion').count()).toBe(1);

      // find 0 entries with search term 'foobar'
      await search.fill('foobar');
      expect(await page.getByTestId('suggestion-list').getByTestId('suggestion').count()).toBe(0);
    });

    test('should show archived message for archived repositories', async({ page, }) => {
      await openCreateDialog(page);

      // an archived repository should show information about archived
      await page.getByTestId(`suggestion-${archivedRepository}-add`).hover();
      await page.getByText('This repository is archived').first().waitFor();

      // non archived repository should show the add repository tooltip and not the archived message
      await page.getByTestId(`suggestion-${notArchivedRepository}-add`).hover();
      await page.getByText('Add Repository').first().waitFor();
      await page.getByText('This repository is archived').waitFor({
        state: 'hidden',
      });
    });

    test('should not be able to add an archived repository', async({ page, }) => {
      await openCreateDialog(page);
      await expect(page.getByTestId(`suggestion-${archivedRepository}-add`)).toBeDisabled();
    });

    test('should add a non archived suggested repository', async({ page, }) => {
      const [ owner, repository, ] = notArchivedRepository.split('/');
      await mockGithubGraphql(page, `repository(owner: "${owner}", name: "${repository}") {`, {
        data: {
          repository: {
            pullRequests: {
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
              nodes: [],
            },
          },
          rateLimit: {
            cost: 4,
            limit: 5000,
            remaining: 4996,
            used: 69,
            resetAt: new Date(),
          },
        },
      });
      await openCreateDialog(page);
      await page.getByTestId(`suggestion-${notArchivedRepository}-add`).waitFor();
      await page.getByTestId(`suggestion-${notArchivedRepository}-add`).click();
      await page.getByTestId('repository-list').getByTestId(`repository-${notArchivedRepository}`).waitFor();
    });
  });
});
