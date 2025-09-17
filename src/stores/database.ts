import { defineStore } from 'pinia';
import { ref } from 'vue';
import GitHub from 'src/lib/github';

const useDatabaseStore = defineStore('db', () => {
  const db = ref<IDBDatabase | null>(null);

  function deleteEntry(storeName: string, id: string | number) {
    const pullRequestStore = db.value!.transaction([ storeName, ], 'readwrite').objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = pullRequestStore.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject();
    });
  }

  function fetchPullRequestsByRepo(ownerAndRepo: string, cursor: string | null = null) {
    return GitHub.fetchPullRequests(ownerAndRepo, cursor)
      .then(({ data, }) => {
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
          const fallbackStatus = hasChangesRequested ? 'changes-requested' : 'pending';
          const [ org, repo, ] = ownerAndRepo.split('/');

          return {
            ...node,
            org,
            repo,
            statusCheckRollup: node.statusCheckRollup?.state || 'UNKNOWN',
            fetchedAt: new Date(),
            latestOpinionatedReviews: latestOpinionatedReviews,
            calculatedReviewStatus: isApproved ? 'approved' : fallbackStatus,
            labels: node.labels.nodes.map((label) => {
              return label;
            }),
            reviewRequests: node.reviewRequests.nodes.map((request) => {
              return request;
            }),
          };
        });

        for (const pullRequest of apiPullRequests) {
          const pullRequestStore = db.value!.transaction([ 'pull_requests', ], 'readwrite').objectStore('pull_requests');
          const request = pullRequestStore.put(pullRequest);
          request.onerror = () => console.log('Fail to update pull request');
        }

        if (!data.data.repository.pullRequests.pageInfo.hasNextPage) {
          return;
        }

        return fetchPullRequestsByRepo(ownerAndRepo, data.data.repository.pullRequests.pageInfo.endCursor);
      });
  }

  return {
    fetchPullRequestsByRepo,
    deleteEntry,
    db,
  };
});

export default useDatabaseStore;
