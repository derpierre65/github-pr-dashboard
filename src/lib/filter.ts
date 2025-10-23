import useDatabaseStore from 'stores/database';
import jsep from 'jsep';
import { computed } from 'vue';

jsep.addBinaryOp('AND', 2);
jsep.addBinaryOp('and', 2);
jsep.addBinaryOp('&&', 2);
jsep.addBinaryOp('OR', 1);
jsep.addBinaryOp('or', 1);
jsep.addBinaryOp('||', 1);
jsep.addBinaryOp('NOT IN', 7);
jsep.addBinaryOp('not in', 7);
jsep.addBinaryOp('IN', 7);
jsep.addBinaryOp('in', 7);
jsep.addBinaryOp('!=', 6);
jsep.addBinaryOp('=', 6);
jsep.addBinaryOp('==', 6);
jsep.addBinaryOp('<>', 6);
jsep.addBinaryOp('~', 6);

const filterFunctions = {
  getReviewDate(context: GitHubPullRequest, type: GitHubPullRequest['latestOpinionatedReviews'][number]['state'] = 'APPROVED') {
    const latestApprovement = context.latestOpinionatedReviews.reduce((latestApprove, review) => {
      if (review.state === type && review.createdAt > latestApprove) {
        latestApprove = review.createdAt;
      }

      return latestApprove;
    }, '');

    return latestApprovement ? new Date(latestApprovement) : 0;
  },
  getReviewRequestedAt(context: GitHubPullRequest, type: 'latest' | 'newest' = 'newest') {
    if (type !== 'latest' && type !== 'newest') {
      throw new Error(`Invalid type ${type}`);
    }

    context._cacheRequestedReviewTimes ??= context.timelineItems.reduce((requestedReviews, item) => {
      if (item.__typename === 'ReviewRequestedEvent') {
        requestedReviews[item.requestedReviewer.login] = item.createdAt;
      }
      else if (item.__typename === 'ReviewDismissedEvent') {
        delete requestedReviews[item.review.author.login];
      }
      else if (item.__typename === 'ReviewRequestRemovedEvent') {
        delete requestedReviews[item.requestedReviewer.login];
      }

      return requestedReviews;
    }, {} as Record<string, string>);

    const requestedReviewTimes = context._cacheRequestedReviewTimes;

    const sortedDates = Object.values(requestedReviewTimes).sort((reviewerA, reviewerB) => {
      return reviewerA.localeCompare(reviewerB);
    });

    return new Date(sortedDates[type === 'newest' ? sortedDates.length - 1 : 0]);
  },
};

function useFilterVariables() {
  const dbStore = useDatabaseStore();

  return computed(() => ({
    '@me': dbStore.settings.username,
  }));
}

const DURATION_SECONDS: Record<string, number> = ((values) => {
  return Object.fromEntries(Object.keys(values).flatMap((value) => {
    return values[value].split(',').filter(Boolean).map((keyword: string) => {
      return [
        keyword.trim(),
        Number(value),
      ];
    });
  }));
})({
  [365 * 24 * 60 * 60]: 'years,year,y',
  [30 * 24 * 60 * 60]: 'months,month,mo',
  [7 * 24 * 60 * 60]: 'weeks,week,w',
  [24 * 60 * 60]: 'days,day,d',
  [60 * 60]: 'hours,hour,hrs,hr,h',
  [60]: 'minutes,minute,mins,min,m',
  [1]: 'seconds,second,secs,sec,s',
});

const durationRegex = new RegExp(`(?<!["'])([+-]?\\d+)\\s*(${Object.keys(DURATION_SECONDS)
  .filter(Boolean)
  .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // escapen
  .join('|')})(?!["'])`, 'g');

function convertDurationToSeconds(input: string): string {
  return input.replace(durationRegex, (_, number, unit) => {
    return parseInt(number) * DURATION_SECONDS[unit];
  });
}

function toMilliseconds(value: Date | number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Date.now() + (value * 1000);
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return null;
}

const filterAliases = {
  draft: 'isDraft',
  organization: 'org',
  repository: 'repo',
  reviewStatus: 'calculatedReviewStatus',
  userReviewRequested: 'requestedReviewers',
  reviewedBy: 'latestOpinionatedReviews',
  comments: 'totalCommentsCount',
} satisfies Record<string, keyof GitHubPullRequest>;

function toLowerCase(value: string | number) {
  return typeof value === 'string' ? value.toLowerCase() : value;
}

function getFilterNodeValue(node: jsep.CoreExpression, context: GitHubPullRequest) {
  switch (node.type) {
    case 'BinaryExpression': {
      let nodeRight = node.right;
      if (nodeRight.type === 'Identifier') {
        nodeRight = {
          type: 'Literal',
          value: node.right.name,
          raw: `"${node.right.name}"`,
        } satisfies jsep.Literal;
      }

      const left = getFilterNodeValue(node.left, context);
      const right = getFilterNodeValue(nodeRight, context);
      let leftValue = left;
      if (Array.isArray(left) && left.length === 1) {
        leftValue = left[0];
      }
      let rightValue = right;
      if (Array.isArray(right) && right.length === 1) {
        rightValue = right[0];
      }

      if (typeof rightValue === 'string') {
        rightValue = rightValue.toLowerCase();
      }
      if (typeof leftValue === 'string') {
        leftValue = leftValue.toLowerCase();
      }

      switch (node.operator) {
        case '<>':
        case '!=':
          if (Array.isArray(leftValue)) {
            return !leftValue.includes(rightValue);
          }

          return leftValue !== rightValue;
        case '==':
        case '=':
          if (Array.isArray(leftValue)) {
            return leftValue.includes(rightValue);
          }

          return leftValue === rightValue;
        case '&&':
        case 'and':
        case 'AND':
          return !!(left && right);
        case '||':
        case 'OR':
        case 'or':
          return !!(left || right);
        case '~':
          return (Array.isArray(left) ? left.map(String).join('') : String(left)).includes(String(rightValue));
        case '>':
        case '>=':
        case '<':
        case '<=': {
          const leftMs = toMilliseconds(left);
          const rightMs = toMilliseconds(right);

          if (leftMs !== null && rightMs !== null) {
            if (node.operator === '>') {
              return leftMs > rightMs;
            }
            else if (node.operator === '>=') {
              return leftMs >= rightMs;
            }
            else if (node.operator === '<') {
              return leftMs < rightMs;
            }
            else if (node.operator === '<=') {
              return leftMs <= rightMs;
            }
          }

          console.log('Invalid left or right value?', left, right);

          return false;
        }
        case 'not in':
        case 'NOT IN': {
          const inRightValue = (Array.isArray(right) ? right : [ right, ]).map(toLowerCase);
          if (!Array.isArray(left)) {
            return !inRightValue.includes(toLowerCase(left));
          }

          if (Array.isArray(left)) {
            return !left.some((leftValue) => inRightValue.includes(toLowerCase(leftValue)));
          }

          console.debug('unknown NOT IN', left, inRightValue);

          return false;
        }
        case 'in':
        case 'IN': {
          const inRightValue = (Array.isArray(right) ? right : [ right, ]).map(toLowerCase);
          if (!Array.isArray(left)) {
            return inRightValue.includes(toLowerCase(left));
          }

          if (Array.isArray(left)) {
            return left.some((leftValue) => inRightValue.includes(toLowerCase(leftValue)));
          }

          console.debug('unknown IN', left, node.right);

          return false;
        }

        case '+':
          return left - right;

        case '-':
          return left - right;
      }

      console.debug(`Unknown operator ${node.operator}`);

      return false;
    }

    case 'SequenceExpression':
      return node.expressions.reduce((values, expression) => {
        let formattedExpression = expression;
        if (expression.type === 'Identifier') {
          formattedExpression = {
            type: 'Literal',
            value: expression.name,
            raw: `"${expression.name}"`,
          } as jsep.Literal;
        }

        const resolvedValue = getFilterNodeValue(formattedExpression, context);
        values.push(...Array.isArray(resolvedValue) ? resolvedValue : [ resolvedValue, ]);

        return values;
      }, []);

    case 'Identifier': {
      const fieldName = filterAliases[node.name] || node.name;
      if (fieldName === 'author') {
        return context[node.name]?.login || null;
      }
      if (fieldName === 'labels') {
        return context.labels.map((label) => label.name) || [];
      }
      if (fieldName === 'latestOpinionatedReviews') {
        return context.latestOpinionatedReviews.map((reviewer) => reviewer.author.login);
      }
      if (fieldName === 'requestedReviewers') {
        return context.requestedReviewers.map((reviewer) => reviewer.login);
      }
      if ([
        'createdAt',
        'updatedAt',
        'lastEditedAt',
      ].includes(fieldName)) {
        return new Date(context[fieldName]);
      }

      return context[fieldName];
    }

    case 'UnaryExpression': {
      const unaryNode = node as jsep.UnaryExpression;
      const value = getFilterNodeValue(unaryNode.argument as jsep.CoreExpression, context);
      switch (unaryNode.operator) {
        case '-': {
          const number = Number(value);

          return Number.isFinite(number) ? -number : NaN;
        }
        case '+': {
          const number = Number(value);

          return Number.isFinite(number) ? +number : NaN;
        }
      }

      return value;
    }

    case 'CallExpression': {
      if (typeof filterFunctions[node.callee.name] === 'undefined') {
        throw new Error(`Invalid function ${node.callee.name}`);
      }

      try {
        return filterFunctions[node.callee.name](
          context,
          ...node.arguments.map((argument) => getFilterNodeValue(argument, context)),
        );
      }
      catch(error) {
        throw new Error(`Function ${node.callee.name} failed to execute for ${context.org}/${context.repo}#${context.number}: ${error.message}`);
      }
    }

    case 'Literal':
      return node.value;

    case 'Compound':
      return node.body.every((subNode) => getFilterNodeValue(subNode, context));
  }

  return false;
}

function getQueryExpressions(query: string, variables: Record<string, string> = {}) {
  for (const [ key, value, ] of Object.entries(variables)) {
    query = query.replace(new RegExp(`"${key}"`, 'g'), `"${value}"`);
    query = query.replace(new RegExp(key, 'g'), `"${value}"`);
  }

  // Normalize human-readable durations (e.g., -7d, 2h, 15min) to seconds outside of quotes
  query = convertDurationToSeconds(query);

  return jsep(query);
}

function filterByQuery(pullRequests: GitHubPullRequest[], query: string, variables: Record<string, string> = {}) {
  const ast = getQueryExpressions(query, variables);

  return pullRequests.filter((pullRequest) => {
    return getFilterNodeValue(ast, pullRequest);
  });
}
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

      if (filter.compare === 'includes' || filter.compare === 'includes all') {
        const includeAll = filter.compare === 'includes all';
        let found = false;
        if (Array.isArray(compareValue)) {
          for (const filterValue of filter.values) {
            if (includes(compareValue, filterValue)) {
              found = true;
              if (!includeAll) {
                break;
              }
            }
            else if (includeAll) {
              return false;
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
          if (includes(filter.values, compareValue)) {
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

function executeFilter(pullRequests: GitHubPullRequest[], filter: DBFilter, variables: Record<string, string> = {}) {
  if (filter.filters === null) {
    return filterByQuery(pullRequests, filter.query, variables);
  }

  return filterBy(pullRequests, filter.filters);
}

export {
  getQueryExpressions,
  useFilterVariables,
  executeFilter,
  filterByQuery,
  filterBy,
};
