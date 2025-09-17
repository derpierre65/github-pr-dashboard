<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>
          GitHub Pull Request Overview
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view v-if="hasAccess" />
    </q-page-container>
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
