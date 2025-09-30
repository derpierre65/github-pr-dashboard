<template>
  <q-select
    v-model="value"
    class="tw:min-w-[200px]"
    input-debounce="0"
    multiple
    emit-value
    map-options
    dense
    outlined
  />
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const model = defineModel<{
  value: string[] | string;
  type: '=' | '!=';
}>({
  required: true,
});

const value = computed({
  get: () => model.value.value.slice(),
  set: (value) => {
    model.value = {
      type: model.value.type,
      value: value,
    };
  },
});
</script>
