<template>
  <q-layout view="lHh Lpr lff">
    <q-page-container>
      <router-view v-if="hasAccess" class="q-pb-lg" />
      <q-page v-else-if="error" class="flex flex-center">
        <q-banner class="bg-red-10">
          {{ error }}
        </q-banner>
      </q-page>
    </q-page-container>

    <q-footer class="tw:h-12 q-pa-sm tw:bg-neutral-900!" bordered>
      <div class="tw:container q-mx-auto flex full-height items-center">
        <div>
          This is an <a
            href="https://github.com/derpierre65/github-pr-dashboard"
            class="text-primary"
            target="_blank"
            rel="noopener noreferrer"
          >Open Source</a> Project
        </div>
        <q-space />
        <div>
          <span>Proudly made by <a
            href="https://www.derpierre65.dev/"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary"
          >derpierre65</a> with </span>
          <q-icon name="fa fa-heart" color="red">
            <q-tooltip>love</q-tooltip>
          </q-icon>
          <span> in Ireland</span>
        </div>
      </div>
    </q-footer>

    <q-dialog v-model="updateAvailable" position="bottom" no-focus seamless>
      <q-card class="tw:w-96">
        <q-card-section class="row items-center no-wrap">
          <div>A new version is available.</div>
          <q-space />
          <q-btn label="Refresh" color="primary" @click="refreshApplication" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Loading, useInterval } from 'quasar';
import useDatabaseStore from 'stores/database';
import axios from 'axios';

defineOptions({
  name: 'MainLayout',
});

const dbStore = useDatabaseStore();

const hasAccess = ref(false);
const updateAvailable = ref(false);
const error = ref('');

function refreshApplication() {
  window.location.reload();
}

window.setTimeout(() => {
  if (hasAccess.value || error.value) {
    return;
  }

  Loading.show({
    group: 'opening',
    message: 'Creating database...',
  });
}, 500);

const databaseRequest = indexedDB.open('github_pr_overview', 4);

databaseRequest.onupgradeneeded = (event: Event) => {
  const db = event.target!.result as IDBDatabase;

  if (!db.objectStoreNames.contains('pull_requests')) {
    db.createObjectStore('pull_requests', {
      keyPath: 'id',
    });
  }
  if (!db.objectStoreNames.contains('repositories')) {
    const store = db.createObjectStore('repositories', {
      keyPath: 'repository',
    });
    store.createIndex('repository', 'repository', {
      unique: true,
    });
  }
  if (!db.objectStoreNames.contains('filters')) {
    db.createObjectStore('filters', {
      keyPath: 'id',
      autoIncrement: true,
    });
  }
};
databaseRequest.onsuccess = (event: Event) => {
  dbStore.db = event.target!.result as IDBDatabase;
  hasAccess.value = true;
  Loading.hide('opening');
};
databaseRequest.onerror = () => {
  error.value = 'Can\t create database.';
  Loading.hide('opening');
};

window.navigator.storage.persist();

if (!import.meta.env.DEV) {
  useInterval().registerInterval(() => {
    if (updateAvailable.value) {
      return;
    }

    axios
      .get('/assets/version.json', {
        baseURL: '',
        params: {
          t: Date.now(),
        },
      })
      .then(({ data, }) => {
        if (data.date.toString() !== import.meta.env.VITE_BUILD_TIMESTAMP) {
          updateAvailable.value = true;
        }
      })
      .catch(() => {
        // do nothing
      });
  }, 30_000);
}
</script>
