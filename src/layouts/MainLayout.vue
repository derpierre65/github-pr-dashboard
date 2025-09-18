<template>
  <q-layout view="lHh Lpr lff">
    <q-page-container>
      <router-view v-if="hasAccess" class="q-pb-lg" />
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
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Loading } from 'quasar';
import useDatabaseStore from 'stores/database';

defineOptions({
  name: 'MainLayout',
});

const hasAccess = ref(false);
const dbStore = useDatabaseStore();

window.setTimeout(() => {
  if (hasAccess.value) {
    return;
  }

  Loading.show({
    group: 'opening',
    message: 'Please enable persistent storage, to use this page.',
  });
}, 500);

window.navigator.storage.persist().then((granted) => {
  if (!granted) {
    return;
  }

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
});
</script>
