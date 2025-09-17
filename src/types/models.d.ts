type GitHubUser = {
  login: string;
  avatarUrl: string;
};

type PullRequest = {
  id: number;
  number: number;
  title: string;
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  state: 'OPEN';
  // assignee: GitHubUser | null;
  // assignees: [];
  totalCommentsCount: number;
  draft: boolean;
  body: string;
  created_at: string;
  author: GitHubUser;
};
