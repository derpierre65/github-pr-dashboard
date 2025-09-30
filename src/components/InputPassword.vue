<template>
  <q-input
    :type="visible ? 'text' : 'password'"
    dense
  >
    <template #append>
      <q-icon
        class="tw:text-base! cursor-pointer"
        :name="visible ? 'fas fa-eye-slash' : 'fas fa-eye'"
        @click="visible = !visible"
      >
        <q-tooltip v-if="visible">
          Hide {{ $attrs.label }}
        </q-tooltip>
        <q-tooltip v-else>
          Show {{ $attrs.label }}
        </q-tooltip>
      </q-icon>
    </template>
  </q-input>
</template>

<script setup lang="ts">
const visible = defineModel<boolean>('visible', {
  default: false,
});
</script>
