<template>
  <q-page class="tw:container tw:xl:max-w-[1800px] tw:mx-auto">
    <div class="tw:flex tw:gap-4 q-mt-md">
      <div class="tw:w-[400px] tw:shrink-0">
        <div class="tw:sticky tw:top-4 tw:h-[calc(100vh-32px)] overflow-hidden tw:overflow-y-auto! tw:pr-2">
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
            <q-item
              class="tw:flex items-center tw:gap-1 cursor-pointer tw:px-1!"
              clickable
              dense
              @click="toggleCollapse(groupName)"
            >
              <q-item-section class="q-pr-none" side>
                <q-icon
                  :name="collapsed[groupName] ? 'fas fa-chevron-right' : 'fas fa-chevron-down'"
                  size="xs"
                />
              </q-item-section>
              <q-item-section>
                <span>{{ groupName }}</span>
              </q-item-section>
              <q-item-section v-if="collapsed[groupName]" side>
                <q-badge :label="groupedFilterValues[groupName]" color="grey-9" rounded />
              </q-item-section>
            </q-item>
            <q-list v-if="!collapsed[groupName]" dense>
              <q-item
                v-for="filter in group"
                :key="filter.id"
                class="tw:px-1!"
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
                  <q-icon v-if="filter.showAsNotification || filter.showAsNotificationDecrease" name="fas fa-bell" size="xs" color="green-9">
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
            <InputPassword
              v-model="dbStore.settings.token"
              label="GitHub Token"
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

      <div class="tw:flex-auto q-gutter-y-md">
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

        <q-banner v-if="filteredPullRequests.length === 0" class="bg-positive">
          No pull requests found.
        </q-banner>
        <PullRequestTable
          v-else
          :items="filteredPullRequests"
          @click-author="addTempFilter('author', $event)"
          @click-label="addTempFilter('label', $event)"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue';
import useDatabaseStore from 'stores/database';
import { Dialog, Loading, Notify, useInterval } from 'quasar';
import DialogRepositoryAdd from 'components/DialogRepositoryAdd.vue';
import DialogFilterEdit from 'components/DialogFilterEdit.vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import GitHub, { GitHubResponse } from 'src/lib/github';
import { executeFilter, useFilterVariables } from 'src/lib/filter';
import PullRequestTable from 'components/PullRequestTable.vue';
import InputPassword from 'components/InputPassword.vue';

dayjs.extend(relativeTime);

defineOptions({
  name: 'IndexPage',
});

const dbStore = useDatabaseStore();
const autoReloadInterval = useInterval();

const filters = ref<DBFilter[]>([]);
const currentFilters = ref<DBFilter[]>([]);
const repositories = ref<DBRepository[]>([]);
const autoReload = ref(true);
const reloading = ref(false);
const collapsed = ref(JSON.parse(window.localStorage.getItem('pr_dashboard_collapsed') || '{}'));

const filterVariables = useFilterVariables();

const filteredPullRequests = computed(() => {
  const filteredPullRequests = currentFilters.value.length ? [] : dbStore.pullRequests;
  for (const currentFilter of currentFilters.value) {
    filteredPullRequests.push(...executeFilter(dbStore.pullRequests, currentFilter, filterVariables.value));
  }

  return filteredPullRequests.sort((pullRequestA, pullRequestB) => {
    return new Date(pullRequestB.createdAt).getTime() - new Date(pullRequestA.createdAt).getTime();
  });
});

const availableRepositories = computed(() => {
  return Object.groupBy(dbStore.pullRequests, (pullRequest) => `${pullRequest.org}/${pullRequest.repo}`);
});

const groupedFilters = computed(() => {
  return Object.groupBy(filters.value, (filter) => {
    const split = filter.name.split('/');

    return split.length >= 2 ? split[0] : 'No Group';
  });
});

const groupedFilterValues = computed(() => {
  return Object.keys(groupedFilters.value).reduce((groupedFilterValues, groupName) => {
    groupedFilterValues[groupName] = groupedFilters.value[groupName].reduce((count, filter) => {
      return count + filterValues.value[filter.id];
    }, 0);

    return groupedFilterValues;
  }, {});
});

const filterValues = computed(() => {
  if (!filters.value.length) {
    return {};
  }

  console.time('Recalculate Filter Values');
  const filterValues = Object.fromEntries(filters.value.map((filter) => {
    return [
      filter.id,
      executeFilter(dbStore.pullRequests, filter, filterVariables.value).length,
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
    .onOk(async() => {
      await reload(false);

      const activeFilter = currentFilters.value.findIndex((currentFilter) => currentFilter.id === filter.id);
      if (activeFilter === -1) {
        return;
      }

      currentFilters.value[activeFilter] = filters.value.find((availableFilter) => availableFilter.id === filter.id)!;
    });
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
          ...dbStore.pullRequests.filter((pullRequest) => {
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
  dbStore.pullRequests = await dbStore.getAllEntries<GitHubPullRequest>('pull_requests');
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
      const oldPullRequests = dbStore.pullRequests.filter((pullRequest) => pullRequest.fetchedAt < referenceDate);
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

function toggleCollapse(groupName: string) {
  collapsed.value[groupName] = !collapsed.value[groupName];
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

    dbStore.settings.username = response.data.login;
  }

  window.localStorage.setItem('pr_dashboard_settings', JSON.stringify(dbStore.settings));
}

watch(filterValues, (after, before) => {
  for (const filterId of Object.keys(after)) {
    if (!before[filterId]) {
      continue;
    }

    if (after[filterId] === before[filterId]) {
      continue;
    }

    const filter = filters.value.find((filter) => filter.id === filterId);
    if (!filter.showAsNotification && !filter.showAsNotificationDecrease) {
      continue;
    }

    const numberDecreased = filter.showAsNotificationDecrease && after[filterId] < before[filterId];
    const numberIncreased = filter.showAsNotification && after[filterId] > before[filterId];
    if (!numberDecreased && !numberIncreased) {
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

watch(collapsed, () => {
  window.localStorage.setItem('pr_dashboard_collapsed', JSON.stringify(collapsed.value));
}, {
  deep: true,
});

watchEffect(() => {
  createReloadInterval();
});

reload(false);
</script>
