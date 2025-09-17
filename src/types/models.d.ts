type GitHubUser = {
  login: string;
  avatarUrl: string;
};

type GitHubPullRequest = {
  id: string;
  number: number;
  title: string;
  url: string;
  org: string;
  repo: string;
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  state: 'OPEN';
  // assignee: GitHubUser | null;
  // assignees: [];
  statusCheckRollup: 'SUCCESS' | 'PENDING' | 'FAILURE' | 'UNKNOWN';
  totalCommentsCount: number;
  isDraft: boolean;
  author: GitHubUser;
  createdAt: string;
  updatedAt: string;
  fetchedAt: Date;
};
