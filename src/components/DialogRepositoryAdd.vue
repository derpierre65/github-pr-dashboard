<template>
  <q-dialog ref="dialogRef">
    <q-card class="no-shadow tw:w-full">
      <q-card-section class="tw:flex tw:bg-stone-800 q-py-sm items-center">
        <span>Add Repository</span>
        <q-space />
        <q-icon name="fas fa-times cursor-pointer" @click="onDialogCancel" />
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="repositoryName"
          :loading="loading"
          label="Repository Name"
          placeholder="derpierre65/github-pr-dashboard"
          hint="You need to add the owner and repository name, separated by a slash."
          stack-label
          autofocus
          @keyup.enter="submit"
        />
      </q-card-section>

      <q-card-section class="relative-position">
        <strong>Suggestions</strong>

        <q-input
          v-model="suggestionQuery"
          class="q-mb-xs"
          label="Search"
          dense
          outlined
        />
        <div class="tw:h-[25vh] overflow-auto">
          <q-list v-if="filteredSuggestions" dense>
            <q-item
              v-for="suggestion in filteredSuggestions"
              :key="suggestion.nameWithOwner"
              class="tw:pl-0!"
            >
              <q-item-section class="q-pr-sm" side>
                <q-btn
                  dense
                  color="primary"
                  icon="fas fa-plus"
                  @click="addSuggestionRepository(suggestion.nameWithOwner)"
                >
                  <q-tooltip>Add Repository</q-tooltip>
                </q-btn>
              </q-item-section>
              <q-item-section :class="{'tw:opacity-50': suggestion.isArchived}">
                {{ suggestion.nameWithOwner }}
              </q-item-section>
              <q-item-section side>
                <q-icon v-if="suggestion.isArchived" name="fas fa-box-archive" size="xs">
                  <q-tooltip>This repository is archived.</q-tooltip>
                </q-icon>
              </q-item-section>
            </q-item>
          </q-list>
        </div>
        <q-inner-loading v-if="!filteredSuggestions" showing />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn label="Add" color="primary" :loading="loading" @click="submit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { Loading, Notify, useDialogPluginComponent } from 'quasar';
import { computed, ref } from 'vue';
import useDatabaseStore from 'stores/database';
import GitHub from 'src/lib/github';
import { noop } from 'src/lib/core';

//#region Composable & Prepare
const emit = defineEmits<{
  repositoryAdded: [repositoryName: string];
}>();

const dbStore = useDatabaseStore();
const {
  dialogRef,
  onDialogCancel,
  onDialogOK,
} = useDialogPluginComponent();

//#endregion

//#region Data
const repositoryName = ref('');
const suggestionQuery = ref('');
const suggestions = ref<Array<{
  nameWithOwner: string;
  isArchived: boolean;
}> | null>(null);
const repositories = ref<string[]>([]);
const loading = ref(false);
//#endregion

//#region Computed
const filteredSuggestions = computed(() => {
  if (!suggestions.value) {
    return null;
  }

  const query = suggestionQuery.value.toLowerCase();

  return suggestions.value.filter((suggestion) => {
    if (repositories.value.includes(suggestion.nameWithOwner)) {
      return false;
    }

    return suggestion.nameWithOwner.toLowerCase().includes(query);
  });
});
//#endregion

//#region Watch
//#endregion

//#region Lifecycle Events
//#endregion

//#region Methods
function getRepositories() {
  return new Promise<string[]>((resolve, reject) => {
    const req = dbStore.db!.transaction([ 'repositories', ], 'readonly')
      .objectStore('repositories')
      .index('repository')
      .getAll();

    req.onsuccess = () => {
      resolve(req.result.map(({ repository, }) => repository));
    };
    req.onerror = () => {
      reject(new Error('Error while interacting with local database.'));
    };
  });
}

function searchRepository(repositoryName: string) {
  return new Promise((resolve, reject) => {
    const req = dbStore.db!.transaction([ 'repositories', ], 'readonly')
      .objectStore('repositories')
      .index('repository')
      .getAll(IDBKeyRange.only(repositoryName));

    req.onsuccess = () => {
      resolve(req.result.length > 0);
    };
    req.onerror = () => {
      reject(new Error('Error while interacting with local database.'));
    };
  });
}

async function addRepository(repositoryName: string) {
  loading.value = true;

  try {
    if (await searchRepository(repositoryName)) {
      Notify.create({
        message: 'This repository is already added.',
        color: 'negative',
      });

      return false;
    }

    await dbStore.fetchPullRequestsByRepo(repositoryName);
    await dbStore.saveEntry('repositories', {
      repository: repositoryName,
    });

    emit('repositoryAdded', repositoryName);
    repositories.value.push(repositoryName);

    return true;
  }
  catch(error) {
    Notify.create({
      html: true,
      message: `Something went wrong. Can't fetch pull requests for this repository.<br>Technical details: ${error.message}`,
      color: 'negative',
    });

    return false;
  }
  finally {
    loading.value = false;
  }
}

function addSuggestionRepository(repositoryName: string) {
  Loading.show();
  addRepository(repositoryName)
    .catch(noop)
    .finally(() => Loading.hide());
}

async function submit() {
  if (!repositoryName.value || repositoryName.value.split('/').length < 2) {
    return;
  }

  if (await addRepository(repositoryName.value)) {
    onDialogOK();
  }
}
//#endregion

//#region Created
getRepositories().then((data) => repositories.value = data);
GitHub
  .graphql(`{
    viewer {
      repositoriesContributedTo(
        first: 100,
        includeUserRepositories: true,
        contributionTypes: [COMMIT, PULL_REQUEST, REPOSITORY]
      ) {
        nodes {
          nameWithOwner
          isArchived
        }
      }
    }
  }`)
  .then((response) => {
    if (response.error) {
      return;
    }

    suggestions.value = response.data.data.viewer.repositoriesContributedTo.nodes;
  })
  .catch(noop);
//#endregion
</script>
