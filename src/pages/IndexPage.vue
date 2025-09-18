<template>
  <q-page class="tw:container tw:xl:max-w-[1800px] tw:mx-auto q-mt-md">
    <div class="tw:flex">
      <q-space />

      <div class="tw:space-x-4">
        <q-toggle v-model="autoReload" label="Auto Reload every minute" />
        <q-btn
          color="primary"
          label="Reload"
          icon="fas fa-refresh"
          no-caps
          @click="reload()"
        />
      </div>
    </div>

    <div class="tw:flex tw:gap-4">
      <div class="tw:w-[400px] tw:shrink-0">
        <div class="tw:sticky tw:top-16">
          <div class="tw:flex items-center q-mb-xs">
            <span class="text-grey-6">Filters</span>
            <q-space />
            <q-btn
              color="primary"
              icon="fas fa-plus"
              size="xs"
              dense
              @click="addFilter"
            />
          </div>

          <div v-for="(group, groupName) in groupedFilters" :key="groupName" class="q-mb-sm">
            <span>{{ groupName }}</span>
            <q-list dense>
              <q-item
                v-for="filter in group"
                :key="filter.id"
                class="tw:px-0!"
                clickable
                @click="applyFilter(filter.filters)"
              >
                <q-item-section class="q-pr-xs tw:flex-row! items-center" side>
                  <q-btn
                    icon="fas fa-trash-alt"
                    color="red"
                    size="xs"
                    dense
                    flat
                    @click.stop="removeFilter(filter)"
                  >
                    <q-tooltip>Delete Filter</q-tooltip>
                  </q-btn>
                  <q-btn
                    icon="fas fa-pencil"
                    color="orange"
                    size="xs"
                    dense
                    flat
                    @click.stop="editFilter(filter)"
                  >
                    <q-tooltip>Edit Filter</q-tooltip>
                  </q-btn>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ filterWithoutGroup(filter.name, groupName) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge :label="filterValues[filter.id]" color="grey-9" rounded />
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <div class="tw:flex items-center q-mt-md q-mb-xs">
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
                >
                  <q-tooltip>Remove Repository and Pull Requests</q-tooltip>
                </q-btn>
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
      </div>

      <div class="tw:flex-auto">
        <q-banner v-if="filteredPullRequests.length === 0" class="bg-positive">
          No pull requests found.
        </q-banner>
        <div v-else class="tw:flex tw:flex-col tw:divide-y-[1px] tw:divide-[#3d444db3] tw:border-[#3d444db3] tw:border-2 q-mt-md">
          <PullRequest
            v-for="pullRequest in filteredPullRequests"
            :key="pullRequest.id"
            :item="pullRequest"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue';
import PullRequest from 'components/PullRequest.vue';
import useDatabaseStore from 'stores/database';
import { Dialog, Loading, Notify, useInterval } from 'quasar';
import DialogRepositoryAdd from 'components/DialogRepositoryAdd.vue';
import DialogFilterEdit from 'components/DialogFilterEdit.vue';

defineOptions({
  name: 'IndexPage',
});

const dbStore = useDatabaseStore();

const pullRequests = ref<GitHubPullRequest[]>([]);
const filters = ref<DBFilter[]>([]);
const currentFilters = ref([]);
const localUsername = ref('derpierre65');
const autoReload = ref(true);
const autoReloadInterval = useInterval();

const filteredPullRequests = computed(() => {
  return filterBy(currentFilters.value).sort((pullRequestA, pullRequestB) => {
    return new Date(pullRequestB.createdAt).getTime() - new Date(pullRequestA.createdAt).getTime();
  });
});

const availableRepositories = computed(() => {
  return Object.groupBy(pullRequests.value, (pullRequest) => `${pullRequest.org}/${pullRequest.repo}`);
});

const groupedFilters = computed(() => {
  return Object.groupBy(filters.value, (filter) => {
    const split = filter.name.split('/');

    return split.length >= 2 ? split[0] : 'Other';
  });
});

const filterValues = computed(() => {
  return Object.fromEntries(filters.value.map((filter) => {
    return [
      filter.id,
      filterBy(filter.filters).length,
    ];
  }));
});

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function filterWithoutGroup(name: string, group: string) {
  return name.replace(new RegExp(`^${escapeRegExp(group)}\\/`), '');
}

function filterBy(filters: DBFilter['filters'] = []) {
  if (filters.length === 0) {
    return pullRequests.value;
  }

  return pullRequests.value.filter((pullRequest) => {
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
            pullRequest.author.login === localUsername.value ? '@me' : '',
          ].filter(Boolean);
        }
        else if (filter.type === 'user_review') {
          const reviewers = pullRequest.requestedReviewers.map((reviewer) => reviewer.login);
          if (reviewers.includes(localUsername.value)) {
            reviewers.push('@me');
          }

          cachedCompareValue[filter.type] = reviewers;
        }
        else if (filter.type === 'user_reviewed') {
          cachedCompareValue[filter.type] = pullRequest.latestOpinionatedReviews.map((review) => review.author.login);
          if (cachedCompareValue[filter.type].includes(localUsername.value)) {
            cachedCompareValue[filter.type].push('@me');
          }
        }
      }

      const compareValue = cachedCompareValue[filter.type];

      if (filter.compare === 'includes') {
        let found = false;
        if (Array.isArray(compareValue)) {
          for (const value of compareValue) {
            if (filter.values.includes(value)) {
              found = true;
              break;
            }
          }
        }
        else {
          found = filter.values.includes(compareValue);
        }

        if (!found) {
          return false;
        }
      }

      if (filter.compare === 'excludes') {
        if (!Array.isArray(compareValue)) {
          if (!filter.values.includes(compareValue)) {
            return false;
          }

          continue;
        }

        for (const value of filter.values) {
          if (compareValue.includes(value)) {
            return false;
          }
        }
      }
    }

    return true;
  });
}

function addFilter() {
  Dialog
    .create({
      component: DialogFilterEdit,
    })
    .onOk(() => reload(false));
}

function editFilter(filter: DBFilter) {
  Dialog
    .create({
      component: DialogFilterEdit,
      componentProps: {
        filter,
      },
    })
    .onOk(() => reload(false));
}

function removeFilter(filter: DBFilter) {
  Dialog
    .create({
      message: `Do you really want to delete the filter <strong>${filter.name}</strong>?`,
      html: true,
      cancel: true,
    })
    .onOk(() => {
      Loading.show({
        group: 'removeFilter',
      });

      dbStore.deleteEntry('filters', filter.id).finally(() => {
        reload(false);
        Loading.hide('removeFilter');
      });
    });
}

function addRepository() {
  Dialog
    .create({
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

async function loadPullRequests() {
  pullRequests.value = await dbStore.getAllEntries<GitHubPullRequest>('pull_requests');
}

async function reload(refetch = true) {
  Loading.show({
    group: 'reloadPullRequests',
  });

  try {
    if (refetch) {
      const repositories = await dbStore.getAllEntries<DBRepository>('repositories');
      for (const repository of repositories) {
        await dbStore.fetchPullRequestsByRepo(repository.repository);
      }
    }

    await loadPullRequests();
    filters.value = await dbStore.getAllEntries<DBFilter>('filters');

    if (refetch) {
      Notify.create({
        message: 'Pull requests have been reloaded.',
        color: 'positive',
      });

      const referenceDate = new Date(Date.now() - (120 * 1_000));
      const oldPullRequests = pullRequests.value.filter((pullRequest) => pullRequest.fetchedAt < referenceDate);
      if (oldPullRequests.length) {
        for (const pullRequest of oldPullRequests) {
          await dbStore.deleteEntry('pull_requests', pullRequest.id);
        }
        await loadPullRequests();
      }
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
      compare: 'includes',
      values: [ org, ],
    },
    {
      type: 'repo',
      compare: 'includes',
      values: [ repo, ],
    },
  ]);
}

function applyFilter(filters: DBFilter['filters'] = []) {
  currentFilters.value = filters;
}

watch(filterValues, (after, before) => {
  for (const filterId of Object.keys(after)) {
    if (!before[filterId]) {
      continue;
    }

    if (before[filterId] >= after[filterId]) {
      continue;
    }

    const filter = filters.value.find((filter) => filter.id === filterId);
    if (!filter.showAsNotification) {
      continue;
    }

    const text = filter.notificationText || 'Filter %filter% has a new value %newValue%.';
    new Notification('Filter updated', {
      tag: `filter-${filterId}`,
      body: text
        .replace(/%filter%/g, filter.name)
        .replace(/%newValue%/g, after[filterId])
        .replace(/%oldValue%/g, before[filterId]),
    });
  }
}, {
  deep: true,
});

watchEffect(() => {
  if (autoReload.value) {
    autoReloadInterval.registerInterval(() => reload(true), 60_000);
  }
  else {
    autoReloadInterval.removeInterval();
  }
});

reload(false);
</script>
