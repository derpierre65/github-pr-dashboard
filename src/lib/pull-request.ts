function getPullRequestReviewers(item: GitHubPullRequest) {
  return [
    ...item.latestOpinionatedReviews.map((review) => {
      return {
        name: review.author.login,
        state: review.state,
        title: review.state === 'CHANGES_REQUESTED' ? 'Changes requested' : 'Approved',
      };
    }),
    ...item.requestedReviewers.map((reviewer) => {
      return {
        name: reviewer.login,
        state: 'PENDING',
        title: 'Review required',
      };
    }),
  ];
}

export {
  getPullRequestReviewers,
};
