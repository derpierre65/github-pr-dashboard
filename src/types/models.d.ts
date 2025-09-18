type GitHubUser = {
  login: string;
  avatarUrl: string;
};

type DBRepository = {
  repository: string;
};

type DBFilter = {
  id: string;
  name: string;
  showAsNotification?: boolean;
  notificationText?: string;
  filters: Array<{
    type: string;
    compare: string;
    value?: string | number;
    values?: Array<string | number>;
  }>;
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
  requestedReviewers: GitHubUser[];
  latestOpinionatedReviews: Array<{
    author: GitHubUser;
    state: 'CHANGES_REQUESTED' | 'APPROVED';
  }>;
  createdAt: string;
  calculatedReviewStatus: 'approved' | 'changes_requested' | 'pending';
  updatedAt: string;
  fetchedAt: Date;
};
