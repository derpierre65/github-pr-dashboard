import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import useDatabaseStore from 'stores/database';

const githubAxiosInstance = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  },
});

githubAxiosInstance.interceptors.request.use((config) => {
  config.headers.Authorization ??= `Bearer ${useDatabaseStore().settings.token}`;

  return config;
}, (error) => Promise.reject(error));

class GitHubResponse<T = object> {
  readonly #response: AxiosResponse<T> | null = null;

  readonly #error = null;

  constructor(data: AxiosResponse<T> | null, error: Error | null = null) {
    this.#response = data;
    this.#error = error;
  }

  get error() {
    return this.#error;
  }

  get message() {
    return this.#error?.response?.data?.message || this.#error?.message || 'Unknown Error';
  }

  get data() {
    return this.#response?.data || null;
  }

  get hasMoreResults() {
    if (this.error || !this.#response.headers.link) {
      return false;
    }

    return this.#response.headers.link.includes('rel="next"');
  }
}

export default class GitHub {
  static graphql(query: string, variables = {}) {
    return this.#request('post', '/graphql', {
      data: {
        query,
        ...variables,
      },
    });
  }

  static fetchUser() {
    return this.#request<{
      id: number;
      login: string;
    }>('get', '/user');
  }

  static fetchPullRequests(ownerAndRepo: string, cursor = null) {
    const [ owner, repo, ] = ownerAndRepo.split('/');

    return this.graphql(`query {
      repository(owner: "${owner}", name: "${repo}") {
        pullRequests(states: OPEN, first: 100, after: ${cursor ? `"${cursor}"` : null}, orderBy: {field:CREATED_AT, direction:DESC}) {
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          nodes {
            id
            title
            isDraft
            url
            number
            lastEditedAt
            merged
            state
            totalCommentsCount
            createdAt
            updatedAt
            baseRepository {
              nameWithOwner
            }
            statusCheckRollup {
              state
            }
            author {
              login
              avatarUrl
            }
            labels(first: 100) {
              nodes {
                id
                name
                color
              }
            }
            latestOpinionatedReviews(first: 100) {
              nodes {
                author {
                  __typename
                  login
                  avatarUrl
                }
                state
                createdAt
              }
            }
            timelineItems(first: 100, itemTypes: [REVIEW_REQUESTED_EVENT, REVIEW_DISMISSED_EVENT, REVIEW_REQUEST_REMOVED_EVENT]) {
              nodes {
                __typename
                ... on ReviewRequestedEvent {
                    requestedReviewer {
                      ... on User { __typename, login }
                    }
                    createdAt
                }
                ... on ReviewDismissedEvent {
                    review {
                      author { __typename, login }
                    }
                    createdAt
                }
                ... on ReviewRequestRemovedEvent {
                    requestedReviewer {
                      ... on User { __typename, login }
                    }
                    createdAt
                }
              }
            }
            reviewRequests(first: 100) {
              nodes {
                requestedReviewer {
                  ... on User {
                    __typename
                    login
                    avatarUrl
                    name
                  }
                }
              }
            }
          }
        }
      }
      rateLimit {
        cost
        limit
        remaining
        used
        resetAt
      }
    }`);
  }

  static search(query: string, page = 1) {
    return this.#request('get', '/search/issues', {
      params: {
        q: query,
        advanced_search: '1',
        per_page: 100,
        page,
      },
    });
  }

  static async #request<T>(type: 'get' | 'post', url: string, config: AxiosRequestConfig = {}) {
    config.url ??= url;
    config.method ??= type;

    return githubAxiosInstance
      .request(config)
      .then((response) => new GitHubResponse<T>(response))
      .catch((error) => {
        throw new GitHubResponse<T>(error.response || null, error);
      });
  }
}

export {
  GitHubResponse,
};
