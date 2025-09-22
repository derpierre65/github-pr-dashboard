import useDatabaseStore from 'stores/database';

function includes(array: Array<string | number>, value: string | number) {
  return array.some((arrayValue) => {
    return arrayValue === value || arrayValue.toString().toLowerCase() === value.toString().toLowerCase();
  });
}

function filterBy(pullRequests: GitHubPullRequest[], filters: DBFilter['filters'] = []) {
  if (filters.length === 0) {
    return pullRequests;
  }

  const dbStore = useDatabaseStore();

  return pullRequests.filter((pullRequest) => {
    const cachedCompareValue = {};

    for (const filter of filters) {
      if (typeof cachedCompareValue[filter.type] === 'undefined') {
        cachedCompareValue[filter.type] = pullRequest[filter.type];
        if (filter.type === 'label') {
          cachedCompareValue[filter.type] = pullRequest.labels.map((label) => label.name);
        }
        else if (filter.type === 'author') {
          cachedCompareValue[filter.type] = [
            pullRequest.author.login,
            pullRequest.author.login === dbStore.settings.username ? '@me' : '',
          ].filter(Boolean);
        }
        else if (filter.type === 'user_review') {
          const reviewers = pullRequest.requestedReviewers.map((reviewer) => reviewer.login);
          if (includes(reviewers, dbStore.settings.username)) {
            reviewers.push('@me');
          }

          cachedCompareValue[filter.type] = reviewers;
        }
        else if (filter.type === 'user_reviewed') {
          cachedCompareValue[filter.type] = pullRequest.latestOpinionatedReviews.map((review) => review.author.login);
          if (cachedCompareValue[filter.type].includes(dbStore.settings.username)) {
            cachedCompareValue[filter.type].push('@me');
          }
        }
      }

      const compareValue = cachedCompareValue[filter.type];

      if (filter.compare === 'true' && compareValue !== true) {
        return false;
      }
      if (filter.compare === 'false' && compareValue !== false) {
        return false;
      }

      if (filter.compare === 'includes') {
        let found = false;
        if (Array.isArray(compareValue)) {
          for (const value of compareValue) {
            if (includes(filter.values, value)) {
              found = true;
              break;
            }
          }
        }
        else {
          found = includes(filter.values, compareValue);
        }

        if (!found) {
          return false;
        }
      }

      if (filter.compare === 'excludes') {
        if (!Array.isArray(compareValue)) {
          if (!includes(filter.values, compareValue)) {
            return false;
          }

          continue;
        }

        for (const value of filter.values) {
          if (includes(compareValue, value)) {
            return false;
          }
        }
      }
    }

    return true;
  });
}

export {
  filterBy,
};
