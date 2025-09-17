import { defineStore } from 'pinia';
import { ref } from 'vue';

const useDatabaseStore = defineStore('db', () => {
  const db = ref<IDBDatabase | null>(null);

  return {
    db,
  };
});

export default useDatabaseStore;
