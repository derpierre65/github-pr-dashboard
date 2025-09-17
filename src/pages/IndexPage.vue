<template>
  <q-page class="tw:container tw:mx-auto q-mt-md">
    <div class="tw:flex">
      <q-space />
      <q-btn color="primary" label="Reload" icon="fas fa-refresh" no-caps @click="reload" />
    </div>
    <div class="tw:flex tw:flex-col tw:divide-y-[1px] tw:divide-[#3d444db3] q-mt-md">
      <PullRequest
        v-for="pullRequest in filteredPullRequests"
        :key="pullRequest.id"
        :item="pullRequest"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import GitHub from 'src/lib/github';
import { computed, ref } from 'vue';
import PullRequest from 'src/components/PullRequest.vue';
import useDatabaseStore from 'src/stores/database';
import { Loading } from 'quasar';

defineOptions({
  name: 'IndexPage',
});

const pullRequests = ref([]);

const filteredPullRequests = computed(() => {
  return pullRequests.value
    .filter((pullRequest) => true)
    .sort((pullRequestA, pullRequestB) => {
      return new Date(pullRequestB.createdAt).getTime() - new Date(pullRequestA.createdAt).getTime();
    });
});

function fetchPullRequestsByRepo(repo: string, cursor: string | null = null) {
  const newPullRequests = [];

  return GitHub.fetchPullRequests(repo, cursor)
    .then(({ data, }) => {
      const apiPullRequests = data.data.repository.pullRequests.nodes.map((node) => {
        const latestOpinionatedReviews = node.latestOpinionatedReviews.nodes.map((review) => {
          return review;
        });
        const isApproved = latestOpinionatedReviews.filter((review) => review.state === 'APPROVED').length >= 2;
        const hasChangesRequested = latestOpinionatedReviews.find((review) => review.state === 'CHANGES_REQUESTED');
        const fallbackStatus = hasChangesRequested ? 'changes-requested' : 'pending';

        return {
          ...node,
          repository: repo,
          statusCheckRollup: node.statusCheckRollup.state,
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
        const pullRequestStore = useDatabaseStore().db!.transaction([ 'pull_requests', ], 'readwrite').objectStore('pull_requests');
        const request = pullRequestStore.put(pullRequest);
        request.onsuccess = () => console.log('updated');
        request.onerror = () => console.log(':(');
      }

      newPullRequests.push(...apiPullRequests);

      if (!data.data.repository.pullRequests.pageInfo.hasNextPage) {
        return newPullRequests;
      }

      return fetchPullRequestsByRepo(repo, data.data.repository.pullRequests.pageInfo.endCursor);
    })
    .catch((error) => {
      console.error(error);

      return [];
    });
}

async function reload() {
  Loading.show();
  // reload all repositories
  // await fetchPullRequestsByRepo('owner/repo');
  pullRequests.value = await loadSavedPullRequests();
  Loading.hide();
}

function loadSavedPullRequests() {
  const pullRequestStore = useDatabaseStore().db!.transaction([ 'pull_requests', ], 'readwrite').objectStore('pull_requests');
  const request = pullRequestStore.getAll();

  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve([]);
  });
}

loadSavedPullRequests().then((data) => {
  pullRequests.value = data;
});
</script>
