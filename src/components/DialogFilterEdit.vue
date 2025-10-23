<template>
  <q-dialog ref="dialogRef" persistent no-shake>
    <q-card class="no-shadow tw:!max-w-[1200px] full-width">
      <q-card-section class="tw:flex tw:bg-stone-800 q-py-sm items-center">
        <span>Filter</span>
        <q-space />
        <q-icon name="fas fa-times cursor-pointer" @click="onDialogCancel" />
      </q-card-section>

      <q-card-section class="q-gutter-y-md">
        <q-input
          v-model="filter.name"
          label="Filter Name"
          hint="You can create groups of filters if you use a slash in the name."
          dense
          autofocus
        />

        <div>
          <q-toggle
            :model-value="filter.showAsNotification"
            label="Show Notification if filter count increases"
            dense
            @update:model-value="requestNotificationPermission('showAsNotification', $event)"
          />
        </div>

        <div>
          <q-toggle
            :model-value="filter.showAsNotificationDecrease"
            label="Show Notification if filter count decreases"
            dense
            @update:model-value="requestNotificationPermission('showAsNotificationDecrease', $event)"
          />
        </div>

        <template v-if="filter.showAsNotification || filter.showAsNotificationDecrease">
          <q-input
            v-model="filter.notificationText"
            label="Custom Notification Text"
            dense
          />
          <div>
            You can use some variables in your notification text:
            <ul class="tw:list-disc tw:pl-4">
              <li>%filter% - Name of the filter.</li>
              <li>%newValue% - New count of the filter.</li>
              <li>%oldValue% - Old count of the filter.</li>
            </ul>
          </div>
        </template>

        <div v-if="hasLegacyFilters">
          <q-toggle
            label="Use new experimental filter system"
            :model-value="filter.filters === null"
            dense
            @update:model-value="switchExperimentalFilter"
          />
        </div>

        <div v-if="filter.filters === null" class="flex tw:gap-2 items-start">
          <q-btn-group>
            <q-btn
              :color="queryLanguageMode ? '' : 'primary'"
              :disable="!canUseSimpleFilter"
              label="Simple"
              outline
              no-caps
              @click="queryLanguageMode = false"
            >
              <q-tooltip v-if="!canUseSimpleFilter">
                Your query is too complex for the simple mode.
              </q-tooltip>
            </q-btn>
            <q-btn
              label="Query Language"
              :color="queryLanguageMode ? 'primary' : ''"
              outline
              no-caps
              @click="queryLanguageMode = true"
            />
          </q-btn-group>
          <div v-if="queryLanguageMode" class="tw:flex-auto tw:flex tw:gap-2 tw:items-center!">
            <q-input
              :model-value="filter.query"
              :error="queryErrors !== null"
              :error-message="queryErrors || undefined"
              class="tw:flex-auto"
              label="Search Query"
              outlined
              dense
              autogrow
              hide-bottom-space
              @keydown.enter="submitQuery"
              @change="filter.query = $event"
            >
              <template #after>
                <router-link :to="{name: 'help-filter'}" target="_blank" rel="noopener noreferrer">
                  <q-icon name="fas fa-question-circle" size="xs" @click="openHelp">
                    <q-tooltip>Help</q-tooltip>
                  </q-icon>
                </router-link>
              </template>
            </q-input>
          </div>
          <template v-else>
            <FilterSelect
              v-for="field of simpleFilterOptions"
              :key="field.name"
              v-bind="field.props"
              :model-value="getFieldValue(field.name)"
              @update:model-value="updateQuery(field.name, $event)"
            />
          </template>
        </div>

        <template v-else>
          <div class="tw:flex tw:gap-2 tw:flex-col">
            <FilterOption
              v-for="(row, index) in filter.filters"
              :key="index"
              v-model="filter.filters[index]"
              :filter="row"
              @remove="filter.filters.splice(index, 1)"
            />
          </div>

          <div class="flex q-mt-md">
            <q-btn
              label="Migrate to new filter system"
              color="positive"
              no-caps
              @click="migrateFilter"
            />
            <q-space />
            <q-btn
              :loading="loading"
              label="Add Filter"
              color="primary"
              no-caps
              @click="addFilter"
            />
          </div>
        </template>

        <div class="flex tw:gap-2">
          <q-banner class="bg-blue-10 tw:flex-auto" dense>
            Found <strong>{{ foundPullRequests.length }}</strong> pull requests for this filter.
          </q-banner>
          <q-btn
            :label="showPullRequests ? 'Hide Pull Requests' : 'Show Pull Requests'"
            :color="showPullRequests ? 'grey-8' : 'green'"
            no-caps
            @click="showPullRequests = !showPullRequests"
          />
        </div>
        <template v-if="foundPullRequests.length">
          <q-slide-transition>
            <PullRequestTable
              v-show="showPullRequests"
              :items="foundPullRequests"
              class="tw:max-h-[300px] overflow-auto"
            />
          </q-slide-transition>
        </template>
      </q-card-section>

      <q-card-actions align="right" class="tw:bg-stone-800">
        <q-btn
          :loading="loading"
          label="Save"
          color="primary"
          no-caps
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { Notify, uid, useDialogPluginComponent } from 'quasar';
import { computed, ref } from 'vue';
import useDatabaseStore from 'stores/database';
import FilterOption from 'components/FilterOption.vue';
import PullRequestTable from 'components/PullRequestTable.vue';
import { executeFilter, getQueryExpressions, useFilterVariables } from 'src/lib/filter';
import FilterSelect from 'components/FilterSelect.vue';
import { useRouter } from 'vue-router';

//#region Composable & Prepare
const props = withDefaults(defineProps<{
  filter?: DBFilter | null;
}>(), {
  filter: null,
});

const dbStore = useDatabaseStore();
const {
  dialogRef,
  onDialogCancel,
  onDialogOK,
} = useDialogPluginComponent();
const router = useRouter();
const filterVariables = useFilterVariables();
//#endregion

//#region Data
const filter = ref<DBFilter>(props.filter ? JSON.parse(JSON.stringify(props.filter)) : {
  id: uid(),
  name: '',
  showAsNotification: false,
  showAsNotificationDecrease: false,
  notificationText: '',
  filters: null,
  query: '',
});
const queryLanguageMode = ref(false);
const loading = ref(false);
const showPullRequests = ref(false);
//#endregion

//#region Computed
const possibleRepositories = computed(() => {
  return [ ...new Set(dbStore.pullRequests.map((pullRequest) => pullRequest.repo)), ];
});

const possibleLabels = computed(() => {
  return [ ...new Set(dbStore.pullRequests.map((pullRequest) => (pullRequest.labels || []).map((label) => label.name)).flat(1)), ];
});

const possibleUsers = computed(() => {
  return [
    {
      value: '@me',
      label: 'Current User',
    },
  ].concat([
    ...new Set(dbStore.pullRequests.reduce((users, pullRequest) => {
      users.push(pullRequest.author.login);
      users.push(...(pullRequest.requestedReviewers || []).map((reviewer) => reviewer.login));
      users.push(...(pullRequest.latestOpinionatedReviews || []).map((review) => review.author.login));

      return users;
    }, [])),
  ].map((username) => {
    return {
      value: username,
      label: username,
    };
  }));
});

const simpleFilterOptions = computed(() => {
  return [
    {
      name: 'repo',
      props: {
        label: 'Repository',
        options: possibleRepositories.value.map((repository) => ({
          label: repository,
          value: repository,
        })),
      },
    },
    {
      name: 'author',
      props: {
        label: 'Author',
        options: possibleUsers.value,
      },
    },
    {
      name: 'userReviewRequested',
      props: {
        label: 'Review Requested by',
        options: possibleUsers.value,
      },
    },
    {
      name: 'reviewedBy',
      props: {
        label: 'Reviewed by',
        options: possibleUsers.value,
      },
    },
    {
      name: 'reviewStatus',
      props: {
        label: 'Review Status',
        options: [
          {
            label: 'Approved',
            value: 'approved',
          },
          {
            label: 'Changes Requested',
            value: 'changes_requested',
          },
          {
            label: 'Review required',
            value: 'pending',
          },
        ],
      },
    },
    {
      name: 'labels',
      props: {
        label: 'Label',
        options: possibleLabels.value,
      },
    },
    {
      name: 'draft',
      props: {
        label: 'Draft',
        options: [
          {
            label: 'Yes',
            value: true,
          },
          {
            label: 'No',
            value: false,
          },
        ],
      },
    },
  ];
});

const foundPullRequests = computed(() => {
  if (queryErrors.value) {
    return [];
  }

  try {
    return executeFilter(dbStore.pullRequests, filter.value, filterVariables.value);
  }
  catch(error) {
    return [];
  }
});

const queryExpressions = computed(() => {
  try {
    return filter.value.query ? astToObject(getQueryExpressions(filter.value.query)) : {};
  }
  catch(error) {
    return null;
  }
});

const canUseSimpleFilter = computed(() => {
  return queryExpressions.value !== null && !queryExpressions.value.undefined;
});

const queryErrors = computed(() => {
  if (filter.value.filters !== null) {
    return null;
  }

  try {
    getQueryExpressions(filter.value.query, filterVariables.value);
    executeFilter(dbStore.pullRequests, filter.value, filterVariables.value);

    return null;
  }
  catch(error) {
    return error.message;
  }
});
//#endregion

//#region Watch
//#endregion

//#region Lifecycle Events
//#endregion

//#region Methods
function astToObject(node) {
  const operator = node.operator.toUpperCase();
  switch (node.type) {
    case 'BinaryExpression': {
      if (operator === 'AND') {
        return {
          ...astToObject(node.left),
          ...astToObject(node.right),
        };
      }

      if ([
        'IN',
        'NOT IN',
      ].includes(operator)) {
        return {
          [node.left.name]: {
            type: operator === 'IN' ? '=' : '!=',
            value: node.right.expressions.map(stripValue),
          },
        };
      }

      return {
        [node.left.name]: {
          type: node.operator,
          value: [ stripValue(node.right), ],
        },
      };
    }

    default:
      throw new Error(`Unsupported node type: ${node.type}`);
  }
}

function stripValue(node) {
  if (node.type === 'Literal') {
    return node.value;
  }
  if (node.type === 'Identifier') {
    return node.name;
  }
  return null;
}

function getFieldValue(fieldName: string) {
  if (!queryExpressions.value[fieldName]) {
    return {
      type: '=',
      value: [],
    };
  }

  return queryExpressions.value[fieldName];
}

function updateQuery(fieldName: string, value: any) {
  const newExpressions = Object.assign({}, queryExpressions.value);
  newExpressions[fieldName] = value;

  const parts = [];
  for (const key of Object.keys(newExpressions)) {
    if (newExpressions[key].value.length === 1) {
      let value = newExpressions[key].value[0];
      if (typeof value === 'string') {
        value = `"${value}"`;
      }

      parts.push(`${key} = ${value}`);
    }
    else if (newExpressions[key].value.length) {
      parts.push(`${key} IN (${newExpressions[key].value.map((value) => {
        if (typeof value === 'boolean') {
          return value.toString();
        }
        else if (typeof value === 'number') {
          return value.toString();
        }

        return `"${value}"`;
      }).join(', ')})`);
    }
  }
  filter.value.query = parts.join(' AND ');
}

function addFilter() {
  filter.value.filters.push({
    type: '',
    compare: '',
    values: [],
  });
}

function requestNotificationPermission(field: 'showAsNotification' | 'showAsNotificationDecrease', modelValue: boolean) {
  if (modelValue) {
    return Notification.requestPermission((status) => {
      if (status === 'granted') {
        filter.value[field] = true;
      }
    });
  }

  filter.value[field] = false;
}

async function submit() {
  loading.value = true;

  try {
    await dbStore.saveEntry('filters', JSON.parse(JSON.stringify(filter.value)));
    onDialogOK();
  }
  catch(error) {
    Notify.create({
      html: true,
      message: `Something went wrong.<br>Technical details: ${error.message}`,
      color: 'negative',
    });
  }
  finally {
    loading.value = false;
  }
}

function submitQuery(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) {
    return;
  }

  event.preventDefault();

  filter.value.query = event.target.value;
}

function switchExperimentalFilter() {
  if (filter.value.filters === null) {
    filter.value.filters = [];
    addFilter();
  }
  else {
    filter.value.filters = null;
  }
}

function migrateFilter() {
  const parts = [];
  const newNames = {
    isDraft: 'draft',
    user_reviewed: 'reviewedBy',
    label: 'labels',
    calculatedReviewStatus: 'reviewStatus',
    user_review: 'userReviewRequested',
  };

  for (const filterPart of filter.value.filters) {
    const newFilterName = newNames[filterPart.type] || filterPart.type;
    if (filterPart.compare === 'false' || filterPart.compare === 'true') {
      parts.push(`${newFilterName} = ${filterPart.compare}`);
    }
    else if (filterPart.compare === 'includes') {
      const values = filterPart.value ? [ filterPart.value, ] : filterPart.values;
      if (values.length > 1) {
        parts.push(`${newFilterName} IN (${values.map((value) => `"${value}"`).join(', ')})`);
      }
      else if (values.length === 1) {
        parts.push(`${newFilterName} = "${values[0]}"`);
      }
    }
    else if (filterPart.compare === 'excludes') {
      const values = filterPart.value ? [ filterPart.value, ] : filterPart.values;
      if (values.length > 1) {
        parts.push(`${newFilterName} NOT IN (${values.map((value) => `"${value}"`).join(', ')})`);
      }
      else if (values.length === 1) {
        parts.push(`${newFilterName} != "${values[0]}"`);
      }
    }
    else if (filterPart.compare === 'includes all') {
      const values = filterPart.value ? [ filterPart.value, ] : filterPart.values;
      parts.push(...values.map((value) => `${newFilterName} IN ("${value}")`));
    }
  }

  queryLanguageMode.value = true;
  filter.value.query = parts.join(' AND ');
  filter.value.filters = null;

  if (canUseSimpleFilter.value) {
    queryLanguageMode.value = false;
  }
}

function openHelp(event: MouseEvent) {
  const url = router.resolve({
    name: 'help-filter',
  }).href;
  const popup = window.open(url, '_blank', 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes');
  if (popup && !popup.closed) {
    event.preventDefault();
  }
}
//#endregion

//#region Created
filter.value.query ||= '';
filter.value.showAsNotificationDecrease ??= false;

const hasLegacyFilters = filter.value.id ? filter.value.filters !== null : false;

if (filter.value.filters?.length === 0) {
  addFilter();
}
if (filter.value.filters === null && !canUseSimpleFilter.value) {
  queryLanguageMode.value = true;
}
//#endregion
</script>
