<template>
  <router-view />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';

defineOptions({
  name: 'App',
});

useQuasar().dark.set(true);
</script>
