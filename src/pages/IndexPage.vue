<template>
  <q-page class="tw:container tw:xl:max-w-[1800px] tw:mx-auto q-pt-md">
    <div class="tw:flex">
      <div class="tw:flex tw:gap-1 items-center">
        <q-badge
          v-for="(currentFilter, index) in currentFilters"
          :key="currentFilter.id"
        >
          <span>{{ currentFilter.name }}</span>

          <q-icon name="fas fa-times cursor-pointer" @click="currentFilters.splice(index, 1)" />
        </q-badge>
      </div>

      <q-space />

      <div class="tw:space-x-4">
        <q-toggle
          v-model="autoReload"
          :disable="reloading"
          label="Auto Reload every minute"
          dense
        />
        <q-btn
          :loading="reloading"
          color="primary"
          label="Reload"
          icon="fas fa-refresh"
          no-caps
          @click="reload()"
        />
      </div>
    </div>

    <div class="tw:flex tw:gap-4 q-mt-md">
      <div class="tw:w-[400px] tw:shrink-0">
        <div class="tw:sticky tw:top-2">
          <div class="tw:flex items-center q-mb-xs">
            <span class="text-grey-6">Filters</span>
            <q-space />
            <q-btn
              color="primary"
              icon="fas fa-plus"
              size="xs"
              dense
              @click="addFilter"
            >
              <q-tooltip>Create filter</q-tooltip>
            </q-btn>
          </div>

          <div v-for="(group, groupName) in groupedFilters" :key="groupName" class="q-mb-sm">
            <span>{{ groupName }}</span>
            <q-list dense>
              <q-item
                v-for="filter in group"
                :key="filter.id"
                class="tw:px-0!"
                clickable
                @click="applyFilter(filter, $event)"
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
                <q-item-section class="tw:flex-row! tw:items-center!" side>
                  <q-icon v-if="filter.showAsNotification" name="fas fa-bell" size="xs" color="green-9">
                    <q-tooltip>Notifications enabled</q-tooltip>
                  </q-icon>
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
            >
              <q-tooltip>Add repository</q-tooltip>
            </q-btn>
          </div>
          <q-list dense>
            <q-item
              v-for="repository in repositories"
              :key="repository.repository"
              class="tw:px-0!"
              clickable
              @click="applyRepositoryFilter(repository.repository)"
            >
              <q-item-section class="q-pr-xs" side>
                <q-btn
                  icon="fas fa-trash-alt"
                  color="red"
                  size="xs"
                  dense
                  flat
                  @click.stop="removeRepository(repository.repository)"
                >
                  <q-tooltip>Remove Repository and Pull Requests</q-tooltip>
                </q-btn>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ repository.repository }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :label="availableRepositories[repository.repository]?.length || 0" color="grey-9" rounded />
              </q-item-section>
            </q-item>
          </q-list>

          <div class="tw:flex items-center q-mt-md q-mb-xs">
            <span class="text-grey-6">Settings</span>
          </div>
          <div class="q-gutter-y-md q-mt-xs">
            <q-input
              v-model="dbStore.settings.token"
              label="GitHub Token"
              type="password"
              dense
              @change="updateSettings('token')"
            />
            <small>Create a <a
              href="https://github.com/settings/tokens/new"
              class="text-primary"
              target="_blank"
              rel="noopener noreferrer"
            >GitHub Token</a> with the <strong>repo</strong> scope.</small>
          </div>
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
            @click-author="addTempFilter('author', $event)"
            @click-label="addTempFilter('label', $event)"
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
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import GitHub, { GitHubResponse } from 'src/lib/github';

dayjs.extend(relativeTime);

defineOptions({
  name: 'IndexPage',
});

const dbStore = useDatabaseStore();
const autoReloadInterval = useInterval();

const pullRequests = ref<GitHubPullRequest[]>([]);
const filters = ref<DBFilter[]>([]);
const currentFilters = ref<DBFilter[]>([]);
const repositories = ref<DBRepository[]>([]);
const autoReload = ref(true);
const reloading = ref(false);

const filteredPullRequests = computed(() => {
  const filteredPullRequests = currentFilters.value.length ? [] : pullRequests.value;
  for (const currentFilter of currentFilters.value) {
    filteredPullRequests.push(...filterBy(currentFilter.filters));
  }

  return filteredPullRequests.sort((pullRequestA, pullRequestB) => {
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
  if (!filters.value.length) {
    return {};
  }

  console.time('Recalculate Filter Values');
  const filterValues = Object.fromEntries(filters.value.map((filter) => {
    return [
      filter.id,
      filterBy(filter.filters).length,
    ];
  }));
  console.timeEnd('Recalculate Filter Values');
  return filterValues;
});

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function filterWithoutGroup(name: string, group: string) {
  return name.replace(new RegExp(`^${escapeRegExp(group)}\\/`), '');
}

function includes(array: Array<string | number>, value: string | number) {
  return array.some((arrayValue) => {
    return arrayValue === value || arrayValue.toString().toLowerCase() === value.toString().toLowerCase();
  });
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
  if (reloading.value) {
    return;
  }

  reloading.value = true;
  createReloadInterval();

  try {
    repositories.value = await dbStore.getAllEntries<DBRepository>('repositories');
    if (refetch) {
      for (const repository of repositories.value) {
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
    console.error(error);
    Notify.create({
      message: 'Something went wrong. Can\'t reload pull requests.',
      color: 'negative',
    });
  }

  reloading.value = false;
}

function addTempFilter(type: string, value: string) {
  applyFilter({
    id: `temp_filter_${type}_${value}`,
    name: `${type} ${value}`,
    filters: [
      {
        type: type,
        compare: 'includes',
        values: [ value, ],
      },
    ],
  });
}

function applyRepositoryFilter(repository: string) {
  const [ org, repo, ] = repository.split('/');
  applyFilter({
    id: `custom_repository_${repository}`,
    name: `Repository ${repository}`,
    filters: [
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
    ],
  });
}

function applyFilter(filter: DBFilter, event: Event | null = null) {
  if (!event || !(event instanceof MouseEvent) || !event.ctrlKey) {
    currentFilters.value = [];
  }

  const isActiveFilter = currentFilters.value.findIndex((currentFilter) => currentFilter.id === filter.id);
  if (isActiveFilter >= 0) {
    currentFilters.value.splice(isActiveFilter, 1);
  }
  else {
    currentFilters.value.push(filter);
  }
}

function createReloadInterval() {
  if (autoReload.value) {
    autoReloadInterval.registerInterval(() => reload(true), 60_000);
  }
  else {
    autoReloadInterval.removeInterval();
  }
}

async function updateSettings(field: string) {
  if (field === 'token') {
    Loading.show({
      group: 'validateToken',
    });

    const response: GitHubResponse = await GitHub.fetchUser().catch((error) => error);
    Loading.hide('validateToken');

    if (response.error) {
      Notify.create({
        message: 'Your token is invalid.',
        color: 'negative',
      });
      return;
    }
  }

  const { data, } = await GitHub.fetchUser();
  dbStore.settings.username = data.login;

  window.localStorage.setItem('pr_dashboard_settings', JSON.stringify(dbStore.settings));
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
        .replace(/%newValue%/g, after[filterId].toString())
        .replace(/%oldValue%/g, before[filterId].toString()),
    });
  }
}, {
  deep: true,
});

watchEffect(() => {
  createReloadInterval();
});

reload(false);
</script>
