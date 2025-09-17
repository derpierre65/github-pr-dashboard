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
          placeholder="derpierre65/github-pr-overview"
          hint="You need to add the owner and repository name, separated by a slash."
          stack-label
          @keyup.enter="submit"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn label="Add" color="primary" :loading="loading" @click="submit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { Notify, useDialogPluginComponent } from 'quasar';
import { ref } from 'vue';
import useDatabaseStore from 'stores/database';

//#region Composable & Prepare
const dbStore = useDatabaseStore();
const {
  dialogRef,
  onDialogCancel,
  onDialogOK,
} = useDialogPluginComponent();
//#endregion

//#region Data
const repositoryName = ref('');
const loading = ref(false);
//#endregion

//#region Computed
//#endregion

//#region Watch
//#endregion

//#region Lifecycle Events
//#endregion

//#region Methods
function searchRepository() {
  return new Promise((resolve, reject) => {
    const req = dbStore.db!.transaction([ 'repositories', ], 'readwrite')
      .objectStore('repositories')
      .index('repository')
      .getAll(IDBKeyRange.only(repositoryName.value));

    req.onsuccess = () => {
      resolve(req.result.length > 0);
    };
    req.onerror = () => {
      reject(new Error('Error while interacting with local database.'));
    };
  });
}

async function submit() {
  if (!repositoryName.value || repositoryName.value.split('/').length < 2) {
    return;
  }

  loading.value = true;

  try {
    if (await searchRepository()) {
      Notify.create({
        message: 'This repository is already added.',
        color: 'negative',
      });
      return;
    }

    await dbStore.fetchPullRequestsByRepo(repositoryName.value);
    dbStore.db!.transaction([ 'repositories', ], 'readwrite').objectStore('repositories').add({
      repository: repositoryName.value,
    });
    onDialogOK();
  }
  catch(error) {
    Notify.create({
      html: true,
      message: `Something went wrong. Can't fetch pull requests for this repository.<br>Technical details: ${error.message}`,
      color: 'negative',
    });
  }
  finally {
    loading.value = false;
  }
}
//#endregion

//#region Created
//#endregion
</script>
