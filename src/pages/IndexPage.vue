<template>
  <q-page class="tw:container tw:xl:max-w-[1800px] tw:mx-auto q-mt-md">
    <div class="tw:flex">
      <q-space />
      <q-btn color="primary" label="Reload" icon="fas fa-refresh" no-caps @click="reload()" />
    </div>

    <div class="tw:flex tw:gap-4">
      <div class="tw:min-w-[300px]">
        <div class="tw:flex items-center">
          <span class="text-grey-6">Repositories</span>
          <q-space />
          <q-btn
            color="primary"
            icon="fas fa-plus"
            size="xs"
            dense
            @click="addRepository"
          />
        </div>
        <q-list dense>
          <q-item
            v-for="(repository, name) in availableRepositories"
            :key="name"
            class="tw:px-0!"
            clickable
            @click="applyRepositoryFilter(name)"
          >
            <q-item-section class="q-pr-xs" side>
              <q-btn
                icon="fas fa-trash-alt"
                color="red"
                size="xs"
                dense
                flat
                @click.stop="removeRepository(name)"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ name }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge :label="repository.length" color="grey-9" rounded />
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="tw:flex tw:flex-col tw:divide-y-[1px] tw:divide-[#3d444db3] q-mt-md full-width">
        <PullRequest
          v-for="pullRequest in filteredPullRequests"
          :key="pullRequest.id"
          :item="pullRequest"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import PullRequest from 'components/PullRequest.vue';
import useDatabaseStore from 'stores/database';
import { Dialog, Loading, Notify } from 'quasar';
import DialogRepositoryAdd from 'components/DialogRepositoryAdd.vue';

defineOptions({
  name: 'IndexPage',
});

const dbStore = useDatabaseStore();

const pullRequests = ref<GitHubPullRequest[]>([]);
const currentFilters = ref([]);

const filteredPullRequests = computed(() => {
  return pullRequests.value
    .filter((pullRequest) => {
      if (currentFilters.value.length === 0) {
        return true;
      }

      for (const filter of currentFilters.value) {
        if (!pullRequest[filter.type].includes(filter.value)) {
          return false;
        }
      }

      return true;
    })
    .sort((pullRequestA, pullRequestB) => {
      return new Date(pullRequestB.createdAt).getTime() - new Date(pullRequestA.createdAt).getTime();
    });
});

const availableRepositories = computed(() => {
  return Object.groupBy(pullRequests.value, (pullRequest) => `${pullRequest.org}/${pullRequest.repo}`);
});

function addRepository() {
  Dialog.create({
    component: DialogRepositoryAdd,
  })
    .onOk(() => reload(false));
}

function removeRepository(repositoryName: string) {
  Dialog
    .create({
      message: `Do you really want to remove the repository <strong>${repositoryName}</strong>?`,
      html: true,
      cancel: true,
    })
    .onOk(() => {
      Loading.show({
        group: 'removeRepository',
      });
      Promise
        .allSettled([
          dbStore.deleteEntry('repositories', repositoryName),
          ...pullRequests.value.filter((pullRequest) => {
            return `${pullRequest.org}/${pullRequest.repo}`.toLowerCase() === repositoryName.toLowerCase();
          }).map((pullRequest) => dbStore.deleteEntry('pull_requests', pullRequest.id)),
        ])
        .finally(() => {
          reload(false);
          Loading.hide('removeRepository');
        });
    });
}

async function reload(refetch = true) {
  Loading.show({
    group: 'reloadPullRequests',
  });

  try {
    if (refetch) {
      const repositories = await dbStore.getAllEntries('repositories');
      for (const repository of repositories) {
        await dbStore.fetchPullRequestsByRepo(repository.repository);
      }
    }

    pullRequests.value = await dbStore.getAllEntries('pull_requests');

    if (refetch) {
      Notify.create({
        message: 'Pull requests have been reloaded.',
        color: 'positive',
      });
    }
  }
  catch(error) {
    Notify.create({
      message: 'Something went wrong. Can\'t reload pull requests.',
      color: 'negative',
    });
  }

  Loading.hide('reloadPullRequests');
}

function applyRepositoryFilter(repository: string) {
  const [ org, repo, ] = repository.split('/');
  applyFilter([
    {
      type: 'org',
      value: [ org, ],
    },
    {
      type: 'repo',
      value: [ repo, ],
    },
  ]);
}

function applyFilter(filters: Array<{
  type: 'org' | 'repo';
  value: Array<string | number>;
}>) {
  currentFilters.value = filters;
}

dbStore.getAllEntries('pull_requests').then((data) => {
  pullRequests.value = data;
});
</script>
