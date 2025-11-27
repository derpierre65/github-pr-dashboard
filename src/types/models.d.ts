type GitHubUser = {
  __typename: 'User' | 'Bot';
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
  showAsNotificationDecrease?: boolean;
  notificationText?: string;
  filters: Array<{
    type: string;
    compare: string;
    value?: string | number;
    values?: Array<string | number>;
  }> | null;
  query: string;
};

type GitHubPullRequest = {
  id: string;
  number: number;
  title: string;
  url: string;
  org: string;
  repo: string;
  nameWithOwner: string;
  labels: Array<{
    id: string;
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
    createdAt: string;
  }>;
  timelineItems: Array<{
    __typename: 'ReviewRequestedEvent' | 'ReviewRequestRemovedEvent';
    requestedReviewer: {
      __typename: 'User' | 'Bot';
      login: string;
    };
    createdAt: string;
  } | {
    __typename: 'ReviewDismissedEvent';
    review: {
      author: {
        __typename: 'User' | 'Bot';
        login: string;
      };
    };
    createdAt: string;
  }>;
  createdAt: string;
  lastEditedAt: string;
  merged: boolean;
  calculatedReviewStatus: 'approved' | 'changes_requested' | 'pending';
  updatedAt: string;
  fetchedAt: Date;
  _cacheRequestedReviewTimes?: Record<string, string>;
};
