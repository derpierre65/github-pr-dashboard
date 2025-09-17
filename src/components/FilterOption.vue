<template>
  <div class="tw:grid tw:grid-cols-5 tw:gap-2">
    <div class="tw:flex tw:gap-2 tw:col-span-2 items-center">
      <q-btn
        color="negative"
        icon="fas fa-trash-alt"
        size="sm"
        flat
        dense
        @click="$emit('remove')"
      >
        <q-tooltip>Remove Filter</q-tooltip>
      </q-btn>
      <q-select
        v-model="model.type"
        class="tw:flex-auto"
        :options="availableFilterFields"
        emit-value
        map-options
        dense
      />
    </div>
    <q-select
      v-if="selectedFilterField"
      v-model="model.compare"
      :options="compareOptions"
      emit-value
      map-options
      dense
    />
    <q-select
      v-if="selectedFilterField && selectedFilterField.allowValueInput !== false"
      v-model="model.values"
      class="tw:col-span-2"
      new-value-mode="add-unique"
      input-debounce="0"
      :max-values="selectedFilterField.allowMultiple ? undefined : 1"
      use-input
      use-chips
      multiple
      dense
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';

//#region Composable & Prepare
defineEmits<{
  remove: [];
}>();

const model = defineModel<DBFilter['filters'][0]>({
  required: true,
});
//#endregion

//#region Data
const availableFilterFields = ref(Object.freeze([
  {
    label: 'Organization',
    value: 'org',
    allowedCompare: [
      'includes',
      'excludes',
    ],
    allowMultiple: true,
  },
  {
    label: 'Repository',
    value: 'repo',
    allowedCompare: [
      'includes',
      'excludes',
    ],
    allowMultiple: true,
  },
  {
    label: 'Label',
    value: 'label',
    allowedCompare: [
      'includes',
      'excludes',
    ],
    allowMultiple: true,
  },
  {
    label: 'User review requested',
    value: 'user_review',
    allowedCompare: [
      'includes',
      'excludes',
    ],
    allowMultiple: true,
  },
  {
    label: 'User has reviewed',
    value: 'user_reviewed',
    allowedCompare: [
      'includes',
      'excludes',
    ],
    allowMultiple: true,
  },
  {
    label: 'Author',
    value: 'author',
    allowedCompare: [
      'includes',
      'excludes',
    ],
    allowMultiple: true,
  },
  // {
  //   label: 'Status',
  //   value: 'state',
  //   allowedCompare: [
  //     'includes',
  //     'excludes',
  //   ],
  //   allowMultiple: true,
  // },
  {
    label: 'Is Draft',
    value: 'isDraft',
    allowedCompare: [
      'true',
      'false',
    ],
    allowValueInput: false,
    allowMultiple: false,
  },
]));
//#endregion

//#region Computed
const compareOptions = computed(() => {
  return selectedFilterField.value?.allowedCompare || [];
});
const selectedFilterField = computed(() => {
  return availableFilterFields.value.find((field) => field.value === model.value.type);
});
//#endregion

//#region Watch
watchEffect(() => {
  if (!selectedFilterField.value) {
    model.value.values = [];
    model.value.value = '';
    model.value.compare = '';
    return;
  }

  if (selectedFilterField.value.allowValueInput === false) {
    model.value.value = '';
    model.value.values = [];
  }
  if (selectedFilterField.value.allowMultiple) {
    model.value.value = '';
    model.value.values = model.value.value ? [ model.value.value, ] : model.value.values;
  }
  else {
    model.value.value = model.value.values[0] ?? model.value.value;
    model.value.values = [];
  }

  if (!compareOptions.value.includes(model.value.compare)) {
    model.value.compare = '';
  }
});
//#endregion

//#region Lifecycle Events
//#endregion

//#region Methods
//#endregion

//#region Created
//#endregion
</script>
