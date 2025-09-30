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
    isDraft: true,
    url: 'https://github.com/my-organization2/my-repository2/pull/1312',
    number: 1312,
    lastEditedAt: '2025-09-30T07:29:22Z',
    merged: true,
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
    ],
    org: 'my-organization',
    repo: 'my-repository',
    requestedReviewers: [
      {
        login: 'coderabbitai',
        avatarUrl: 'https://avatars.githubusercontent.com/u/7004269?v=4',
      },
    ],
    fetchedAt: new Date('Tue Sep 30 2025 16:16:13 GMT+0100 (Irish Standard Time)'),
    calculatedReviewStatus: 'approved',
  };
  const allTestPullRequests = [
    pullRequest1,
    pullRequest2,
    pullRequest3,
  ];
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
    it('should find pull requests where arrays contains any value', () => {
      expect(filterByQuery(allTestPullRequests, 'labels NOT IN ("my-label")', variables).length).eq(1);
      expect(filterByQuery(allTestPullRequests, 'labels NOT IN ("my-label", "foo")', variables).length).eq(0);
      expect(filterByQuery(allTestPullRequests, 'author NOT IN ("derpierre65", "foo")', variables).length).eq(1);
      expect(filterByQuery(allTestPullRequests, 'author NOT IN ("coderabbitai", "foo")', variables).length).eq(2);
    });
  });

  describe('IN', () => {
    it('should find pull requests where arrays contains any value', () => {
      expect(filterByQuery(allTestPullRequests, 'labels IN ("my-label")', variables).length).eq(2);
      expect(filterByQuery(allTestPullRequests, 'labels IN ("my-second-label")', variables).length).eq(1);
      expect(filterByQuery(allTestPullRequests, 'labels IN ("my-label", "my-second-label", "foo")', variables).length).eq(3);
      expect(filterByQuery(allTestPullRequests, 'labels IN ("bar", "unknown", "foo")', variables).length).eq(1);
      expect(filterByQuery(allTestPullRequests, 'labels IN ("foobar", "baz")', variables).length).eq(0);
      expect(filterByQuery(allTestPullRequests, 'reviewedBy IN ("coderabbitai")', variables).length).eq(2);
    });
    it('should find pull requests where string contains any value', () => {
      expect(filterByQuery(allTestPullRequests, 'author IN ("derpierre65")', variables).length).eq(2);
      expect(filterByQuery(allTestPullRequests, 'author IN (@me, "coderabbitai", "unknownUser")', variables).length).eq(3);
      expect(filterByQuery(allTestPullRequests, 'author IN (@me, coderabbitai, unknownUser)', variables).length).eq(3);
    });
    it('should find pull requests where value contains numbers', () => {
      expect(filterByQuery(allTestPullRequests, 'totalCommentsCount IN (33,1,2,3)', variables).length).eq(3);
    });
  });

  it('should find pull requests if variables are quoted', () => {
    expect(filterByQuery([ pullRequest1, ], 'author IN ("@me")', variables).length).eq(1);
    expect(filterByQuery([ pullRequest1, ], 'author = "@me"', variables).length).eq(1);
  });

  it('should find pull requests for arrays with one value', () => {
    expect(filterByQuery(allTestPullRequests, 'labels = "my-label"', variables).length).eq(2);
    expect(filterByQuery(allTestPullRequests, 'labels != "my-label"', variables).length).eq(1);
    expect(filterByQuery(allTestPullRequests, 'labels != "foo"', variables).length).eq(2);
  });

  it('should find pull requests if using IN and = filter', () => {
    const pullRequests = [
      pullRequest1,
      pullRequest2,
    ];
    expect(filterByQuery(pullRequests, 'author IN ("coderabbitai", "derpierre65") AND repository = "my-repository"', variables).length).eq(2);
  });

  it('should find pull requests if using two or more IN filter', () => {
    const pullRequests = [
      pullRequest1,
      pullRequest2,
    ];
    expect(filterByQuery(pullRequests, 'author IN ("coderabbitai", "derpierre65") AND repository IN ("my-repository")').length).eq(2);
    expect(filterByQuery(
      pullRequests,
      'reviewStatus IN ("pending", "changes_requested", "approved") AND userReviewRequested IN ("foo", "bar")',
    ).length).eq(0);
  });

  it('should find pull requests if using aliases', () => {
    expect(filterByQuery(allTestPullRequests, 'isDraft = false').length).eq(2);
    expect(filterByQuery(allTestPullRequests, 'organization = "my-organization"').length).eq(3);
    expect(filterByQuery(allTestPullRequests, 'repository = "my-repository"').length).eq(3);
    expect(filterByQuery(allTestPullRequests, 'reviewStatus = "approved"').length).eq(3);
    expect(filterByQuery(allTestPullRequests, 'comments = 33').length).eq(2);
    expect(filterByQuery(allTestPullRequests, 'reviewedBy = coderabbitai').length).eq(2);
    expect(filterByQuery(allTestPullRequests, 'userReviewRequested = coderabbitai').length).eq(1);
  });
});
