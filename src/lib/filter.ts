import useDatabaseStore from 'stores/database';
import jsep from 'jsep';
import { ref } from 'vue';

jsep.addBinaryOp('AND', 2);
jsep.addBinaryOp('and', 2);
jsep.addBinaryOp('&&', 2);
jsep.addBinaryOp('OR', 1);
jsep.addBinaryOp('or', 1);
jsep.addBinaryOp('||', 1);
jsep.addBinaryOp('NOT IN', 1);
jsep.addBinaryOp('not in', 1);
jsep.addBinaryOp('IN', 1);
jsep.addBinaryOp('in', 1);
jsep.addBinaryOp('!=', 6);
jsep.addBinaryOp('=', 6);
jsep.addBinaryOp('==', 6);
jsep.addBinaryOp('<>', 6);
jsep.addLiteral('@me', 'hello');

function useFilterVariables() {
  const dbStore = useDatabaseStore();

  return ref({
    '@me': dbStore.settings.username,
  });
}

const filterAliases = {
  draft: 'isDraft',
  organization: 'org',
  repository: 'repo',
  reviewStatus: 'calculatedReviewStatus',
} satisfies Record<string, keyof GitHubPullRequest>;

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
        case '!=': return leftValue !== rightValue;
        case '==':
        case '=':
          return leftValue === rightValue;
        case '&&':
        case 'and':
        case 'AND':
          return !!(left && right);
        case '||':
        case 'OR':
        case 'or':
          return !!(left || right);
        case 'not in':
        case 'NOT IN': {
          const inRightValue = Array.isArray(right) ? right : [ right, ];
          if (!Array.isArray(left)) {
            return !inRightValue.includes(left);
          }

          if (Array.isArray(left)) {
            return !left.some((leftValue) => inRightValue.includes(leftValue.toLowerCase()));
          }

          console.debug('unknown NOT IN', left, inRightValue);

          return false;
        }
        case 'in':
        case 'IN': {
          const inRightValue = Array.isArray(right) ? right : [ right, ];
          if (!Array.isArray(left)) {
            return inRightValue.includes(left);
          }

          if (Array.isArray(left)) {
            return left.some((leftValue) => inRightValue.includes(leftValue.toLowerCase()));
          }

          console.debug('unknown IN', left, node.right);

          return false;
        }
      }

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
          } satisfies jsep.Literal;
        }

        const resolvedValue = getFilterNodeValue(formattedExpression, context);
        values.push(...Array.isArray(resolvedValue) ? resolvedValue : [ resolvedValue, ]);

        return values;
      }, []);

    case 'Identifier':
      if (node.name === 'author') {
        return context[node.name]?.login || null;
      }
      if (node.name === 'labels') {
        return context.labels.map((label) => label.name) || [];
      }
      if ([
        'user_reviewed',
        'userReviewed',
        'reviewed-by',
        'reviewed_by',
      ].includes(node.name)) {
        return pullRequest.latestOpinionatedReviews.map((review) => review.author.login);
      }

      return context[filterAliases[node.name] || node.name];

    case 'Literal':
      return node.value;

    case 'Compound':
      return node.body.every((subNode) => getFilterNodeValue(subNode, context));
  }

  return false;
}

function getQueryExpressions(query: string, variables: Record<string, string> = {}) {
  return jsep(query.replace(/@me/g, `"${variables['@me']}"`));
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
