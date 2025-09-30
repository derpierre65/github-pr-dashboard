import { describe, expect, it } from 'vitest';
import { filterByQuery } from 'src/lib/filter';

describe('filterByQuery', () => {
  const pullRequest1: GitHubPullRequest = {
    id: 'PR_kwDOE0XT186rQkX1',
    title: 'test(filter): my test pull request',
    isDraft: false,
    url: 'https://github.com/my-organization/my-repository/pull/1312',
    number: 1312,
    lastEditedAt: '2025-09-30T07:29:22Z',
    merged: false,
    state: 'OPEN',
    totalCommentsCount: 3,
    createdAt: '2025-09-30T07:27:08Z',
    updatedAt: '2025-09-30T08:06:53Z',
    statusCheckRollup: 'SUCCESS',
    author: {
      login: 'derpierre65',
      avatarUrl: 'https://avatars.githubusercontent.com/u/7004269?v=4',
    },
    labels: [
      {
        id: 'LA_kwDOE0XT188AAAAB7OcciA',
        name: 'my-label',
        color: '1d76db',
      },
    ],
    latestOpinionatedReviews: [
      {
        author: {
          login: 'reviewed-by-me',
          avatarUrl: 'https://avatars.githubusercontent.com/u/7004269?v=4',
        },
        state: 'APPROVED',
      },
      {
        author: {
          login: 'coderabbitai',
          avatarUrl: 'https://avatars.githubusercontent.com/in/347564?v=4',
        },
        state: 'APPROVED',
      },
    ],
    org: 'my-organization',
    repo: 'my-repository',
    requestedReviewers: [
      {
        login: 'derpierre65',
        avatarUrl: 'https://avatars.githubusercontent.com/u/7004269?v=4',
      },
    ],
    fetchedAt: new Date('Tue Sep 30 2025 16:16:13 GMT+0100 (Irish Standard Time)'),
    calculatedReviewStatus: 'approved',
  };
  const pullRequest2: GitHubPullRequest = {
    id: 'PR_kwDOE0XT186rQkX2',
    title: 'test(filter): my second test pull request',
    isDraft: false,
    url: 'https://github.com/my-organization2/my-repository2/pull/1312',
    number: 1312,
    lastEditedAt: '2025-09-30T07:29:22Z',
    merged: false,
    state: 'OPEN',
    totalCommentsCount: 33,
    createdAt: '2025-09-30T07:27:08Z',
    updatedAt: '2025-09-30T08:06:53Z',
    statusCheckRollup: 'SUCCESS',
    author: {
      login: 'derpierre65',
      avatarUrl: 'https://avatars.githubusercontent.com/u/7004269?v=4',
    },
    labels: [
      {
        id: 'LA_kwDOE0XT188AAAAB7OcciA',
        name: 'my-label',
        color: '1d76db',
      },
      {
        id: 'LA_kwDOE0XT188AAAAB7OcciA',
        name: 'my-second-label',
        color: '1d76db',
      },
    ],
    latestOpinionatedReviews: [
      {
        author: {
          login: 'reviewed-by-me',
          avatarUrl: 'https://avatars.githubusercontent.com/u/7004269?v=4',
        },
        state: 'APPROVED',
      },
      {
        author: {
          login: 'coderabbitai',
          avatarUrl: 'https://avatars.githubusercontent.com/in/347564?v=4',
        },
        state: 'APPROVED',
      },
    ],
    org: 'my-organization',
    repo: 'my-repository',
    requestedReviewers: [
      {
        login: 'derpierre65',
        avatarUrl: 'https://avatars.githubusercontent.com/u/7004269?v=4',
      },
    ],
    fetchedAt: new Date('Tue Sep 30 2025 16:16:13 GMT+0100 (Irish Standard Time)'),
    calculatedReviewStatus: 'approved',
  };
  const pullRequest3: GitHubPullRequest = {
    id: 'PR_kwDOE0XT186rQkX2',
    title: 'test(filter): my second test pull request',
    isDraft: false,
    url: 'https://github.com/my-organization2/my-repository2/pull/1312',
    number: 1312,
    lastEditedAt: '2025-09-30T07:29:22Z',
    merged: false,
    state: 'OPEN',
    totalCommentsCount: 33,
    createdAt: '2025-09-30T07:27:08Z',
    updatedAt: '2025-09-30T08:06:53Z',
    statusCheckRollup: 'SUCCESS',
    author: {
      login: 'coderabbitai',
      avatarUrl: 'https://avatars.githubusercontent.com/u/7004269?v=4',
    },
    labels: [
      {
        id: 'LA_kwDOE0XT188AAAAB7OcciA',
        name: 'foo',
        color: '1d76db',
      },
      {
        id: 'LA_kwDOE0XT188AAAAB7OcciA',
        name: 'bar',
        color: '1d76db',
      },
    ],
    latestOpinionatedReviews: [
      {
        author: {
          login: 'reviewed-by-me',
          avatarUrl: 'https://avatars.githubusercontent.com/u/7004269?v=4',
        },
        state: 'APPROVED',
      },
      {
        author: {
          login: 'coderabbitai',
          avatarUrl: 'https://avatars.githubusercontent.com/in/347564?v=4',
        },
        state: 'APPROVED',
      },
    ],
    org: 'my-organization',
    repo: 'my-repository',
    requestedReviewers: [
      {
        login: 'derpierre65',
        avatarUrl: 'https://avatars.githubusercontent.com/u/7004269?v=4',
      },
    ],
    fetchedAt: new Date('Tue Sep 30 2025 16:16:13 GMT+0100 (Irish Standard Time)'),
    calculatedReviewStatus: 'approved',
  };
  const variables = {
    '@me': 'derpierre65',
  };

  it('should find one pull request for = filters', () => {
    const fields = {
      state: 'OPEN',
      draft: false,
      isDraft: false,
      number: 1312,
      merged: false,
      totalCommentsCount: 3,
      org: '"my-organization"',
      organization: '"my-organization"',
      repo: '"my-repository"',
      repository: '"my-repository"',
      reviewStatus: 'approved',
      author: '@me',
    };
    for (const key of Object.keys(fields)) {
      const simpleQuery = `${key} = ${fields[key]}`;
      expect.soft(filterByQuery([ pullRequest1, ], simpleQuery, variables).length).eq(1, simpleQuery);
    }
  });

  it('should find one pull request for != filters', () => {
    const fields = {
      state: 'CLOSED',
      draft: true,
      isDraft: true,
      number: 1313,
      merged: true,
      totalCommentsCount: 1,
      org: 'organization',
      organization: '"my-second-organization"',
      repo: 'secondrepository',
      repository: '"my-second-repository"',
      reviewStatus: 'changes_requested',
      author: 'authorname',
    };
    for (const key of Object.keys(fields)) {
      const simpleQuery = `${key} != ${fields[key]}`;
      expect.soft(filterByQuery([ pullRequest1, ], simpleQuery, variables).length).eq(1, simpleQuery);
    }
  });

  describe('AND', () => {
    it('should find one pull request for a simple AND filter', () => {
      expect.soft(filterByQuery([ pullRequest1, ], 'author = @me AND state = OPEN', variables).length).eq(1);
      expect.soft(filterByQuery([ pullRequest1, ], 'author = @me AND state = OPEN AND totalCommentsCount = 3', variables).length).eq(1);
      expect.soft(filterByQuery([ pullRequest1, ], 'author = @me AND state = CLOSED AND totalCommentsCount = 3', variables).length).eq(0);
    });

    it('should find one pull request for a simple filter without ANDs', () => {
      expect.soft(filterByQuery([ pullRequest1, ], 'author = @me state = OPEN', variables).length).eq(1);
      expect.soft(filterByQuery([ pullRequest1, ], 'author = @me state = OPEN totalCommentsCount = 3', variables).length).eq(1);
      expect.soft(filterByQuery([ pullRequest1, ], 'author = @me state = CLOSED totalCommentsCount = 3', variables).length).eq(0);
    });

    it('should find one pull request for a simple && filter', () => {
      expect.soft(filterByQuery([ pullRequest1, ], 'author = @me && state = OPEN', variables).length).eq(1);
      expect.soft(filterByQuery([ pullRequest1, ], 'author = @me && state = OPEN && totalCommentsCount = 3', variables).length).eq(1);
      expect.soft(filterByQuery([ pullRequest1, ], 'author = @me && state = CLOSED && totalCommentsCount = 3', variables).length).eq(0);
    });
  });

  describe('OR', () => {
    const pullRequests = [
      pullRequest1,
      pullRequest2,
    ];

    it('should find two pull requests for a simple OR filter', () => {
      expect.soft(filterByQuery(pullRequests, 'author = @me OR state = OPEN', variables).length).eq(2);
      expect.soft(filterByQuery(pullRequests, 'author != @me OR state = CLOSED', variables).length).eq(0);
      expect.soft(filterByQuery(pullRequests, 'totalCommentsCount = 3 OR totalCommentsCount = 33', variables).length).eq(2);
      expect.soft(filterByQuery(pullRequests, 'totalCommentsCount = 4 OR totalCommentsCount = 44', variables).length).eq(0);
    });
    it('should find two pull requests for a simple || filter', () => {
      expect.soft(filterByQuery(pullRequests, 'author = @me || state = OPEN', variables).length).eq(2);
      expect.soft(filterByQuery(pullRequests, 'author != @me || state = CLOSED', variables).length).eq(0);
      expect.soft(filterByQuery(pullRequests, 'totalCommentsCount = 3 || totalCommentsCount = 33', variables).length).eq(2);
      expect.soft(filterByQuery(pullRequests, 'totalCommentsCount = 4 || totalCommentsCount = 44', variables).length).eq(0);
    });
  });

  describe('NOT IN', () => {
    const pullRequests = [
      pullRequest1,
      pullRequest2,
      pullRequest3,
    ];
    it('should find pull requests where arrays contains any value', () => {
      expect(filterByQuery(pullRequests, 'labels NOT IN ("my-label")', variables).length).eq(1);
      expect(filterByQuery(pullRequests, 'labels NOT IN ("my-label", "foo")', variables).length).eq(0);
      expect(filterByQuery(pullRequests, 'author NOT IN ("derpierre65", "foo")', variables).length).eq(1);
      expect(filterByQuery(pullRequests, 'author NOT IN ("coderabbitai", "foo")', variables).length).eq(2);
    });
  });
  describe('IN', () => {
    const pullRequests = [
      pullRequest1,
      pullRequest2,
      pullRequest3,
    ];
    it('should find pull requests where arrays contains any value', () => {
      expect(filterByQuery(pullRequests, 'labels IN ("my-label")', variables).length).eq(2);
      expect(filterByQuery(pullRequests, 'labels IN ("my-second-label")', variables).length).eq(1);
      expect(filterByQuery(pullRequests, 'labels IN ("my-label", "my-second-label", "foo")', variables).length).eq(3);
      expect(filterByQuery(pullRequests, 'labels IN ("bar", "unknown", "foo")', variables).length).eq(1);
      expect(filterByQuery(pullRequests, 'labels IN ("foobar", "baz")', variables).length).eq(0);
    });
    it('should find pull requests where string contains any value', () => {
      expect(filterByQuery(pullRequests, 'author IN ("derpierre65")', variables).length).eq(2);
      expect(filterByQuery(pullRequests, 'author IN (@me, "coderabbitai", "unknownUser")', variables).length).eq(3);
      expect(filterByQuery(pullRequests, 'author IN (@me, coderabbitai, unknownUser)', variables).length).eq(3);
    });
  });

  it('should find pull requests for arrays with one value', () => {
    const pullRequests = [
      pullRequest1,
      pullRequest2,
    ];
    expect(filterByQuery(pullRequests, 'labels = "my-label"', variables).length).eq(1);
    expect(filterByQuery(pullRequests, 'labels != "my-label"', variables).length).eq(1);
    expect(filterByQuery(pullRequests, 'labels != "foo"', variables).length).eq(2);
  });
});
