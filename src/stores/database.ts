import { defineStore } from 'pinia';
import { Ref, ref } from 'vue';
import GitHub from 'src/lib/github';

const useDatabaseStore = defineStore('db', () => {
  const db = ref<IDBDatabase | null>(null);
  const pullRequests = ref<GitHubPullRequest[]>([]) as Ref<GitHubPullRequest[]>;
  const settings = ref<{
    username: string;
    token: string;
  }>(JSON.parse(window.localStorage.getItem('pr_dashboard_settings') || 'null') || {
    username: '',
    token: '',
  });
  const authenticated = ref(false);

  function deleteEntry(storeName: string, id: string | number) {
    const pullRequestStore = db.value!.transaction([ storeName, ], 'readwrite').objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = pullRequestStore.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject();
    });
  }

  function getAllEntries<T = object>(storeName: string) {
    return new Promise<T[]>((resolve, reject) => {
      const req = db.value!.transaction([ storeName, ], 'readonly')
        .objectStore(storeName)
        .getAll();

      req.onsuccess = () => {
        resolve(req.result as T[]);
      };
      req.onerror = () => {
        reject(new Error('Error while interacting with local database.'));
      };
    });
  }

  function saveEntry(storeName: string, entry: object) {
    return new Promise((resolve, reject) => {
      const req = db.value!.transaction([ storeName, ], 'readwrite').objectStore(storeName).put(entry);

      req.onsuccess = () => {
        resolve(req.result);
      };
      req.onerror = () => {
        reject(new Error('Error while interacting with local database.'));
      };
    });
  }

  function fetchPullRequestsByRepo(ownerAndRepo: string, cursor: string | null = null) {
    return GitHub.fetchPullRequests(ownerAndRepo, cursor)
      .then(async({ data, }) => {
        if (data.errors?.length) {
          console.log(JSON.stringify(data.errors, null, 2));
          throw new Error(`GraphQL Request failed: ${data.errors[0].message}`);
        }

        const apiPullRequests = data.data.repository.pullRequests.nodes.map((node) => {
          const latestOpinionatedReviews = node.latestOpinionatedReviews.nodes.map((review) => {
            return review;
          });
          const isApproved = latestOpinionatedReviews.filter((review) => review.state === 'APPROVED').length >= 2;
          const hasChangesRequested = latestOpinionatedReviews.find((review) => review.state === 'CHANGES_REQUESTED');
          const fallbackStatus = hasChangesRequested ? 'changes_requested' : 'pending';
          const [ org, repo, ] = ownerAndRepo.split('/');
          const requestedReviewers = node.reviewRequests.nodes.map((request) => {
            return request.requestedReviewer;
          });

          delete node.reviewRequests;

          return {
            ...node,
            org,
            repo,
            requestedReviewers,
            statusCheckRollup: node.statusCheckRollup?.state || 'UNKNOWN',
            fetchedAt: new Date(),
            latestOpinionatedReviews: latestOpinionatedReviews,
            calculatedReviewStatus: isApproved ? 'approved' : fallbackStatus,
            timelineItems: node.timelineItems.nodes,
            labels: node.labels.nodes,
          };
        });

        const saving = [];
        for (const pullRequest of apiPullRequests) {
          saving.push(saveEntry('pull_requests', pullRequest));
        }

        await Promise.allSettled(saving);

        if (!data.data.repository.pullRequests.pageInfo.hasNextPage) {
          return;
        }

        return fetchPullRequestsByRepo(ownerAndRepo, data.data.repository.pullRequests.pageInfo.endCursor);
      });
  }

  return {
    authenticated,
    db,
    settings,
    pullRequests,
    fetchPullRequestsByRepo,
    getAllEntries,
    saveEntry,
    deleteEntry,
  };
});

export default useDatabaseStore;
