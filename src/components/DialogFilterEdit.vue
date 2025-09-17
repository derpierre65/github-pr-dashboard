<template>
  <q-dialog ref="dialogRef">
    <q-card class="no-shadow tw:max-w-[800px]! full-width">
      <q-card-section class="tw:flex tw:bg-stone-800 q-py-sm items-center">
        <span>Filter</span>
        <q-space />
        <q-icon name="fas fa-times cursor-pointer" @click="onDialogCancel" />
      </q-card-section>

      <q-card-section class="q-gutter-y-md">
        <q-input v-model="filter.name" label="Filter Name" dense />

        <div class="tw:flex tw:gap-2 tw:flex-col">
          <FilterOption
            v-for="(row, index) in filter.filters"
            :key="index"
            v-model="filter.filters[index]"
            :filter="row"
            @remove="filter.filters.splice(index, 1)"
          />
        </div>

        <div class="text-right q-mt-md">
          <q-btn
            :loading="loading"
            label="Add Filter"
            color="primary"
            no-caps
            @click="addFilter"
          />
        </div>
      </q-card-section>

      <q-card-actions align="right" class="tw:bg-stone-800">
        <q-btn
          :loading="loading"
          label="Save"
          color="primary"
          no-caps
          @click="submit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { Notify, uid, useDialogPluginComponent } from 'quasar';
import { ref } from 'vue';
import useDatabaseStore from 'stores/database';
import FilterOption from 'components/FilterOption.vue';

//#region Composable & Prepare
const props = withDefaults(defineProps<{
  filter?: DBFilter | null;
}>(), {
  filter: null,
});

const dbStore = useDatabaseStore();
const {
  dialogRef,
  onDialogCancel,
  onDialogOK,
} = useDialogPluginComponent();
//#endregion

//#region Data
const filter = ref<DBFilter>(props.filter ? JSON.parse(JSON.stringify(props.filter)) : {
  id: uid(),
  name: '',
  filters: [],
});
const loading = ref(false);
//#endregion

//#region Computed
//#endregion

//#region Watch
//#endregion

//#region Lifecycle Events
//#endregion

//#region Methods
function addFilter() {
  filter.value.filters.push({
    type: '',
    compare: '',
    values: [],
  });
}

async function submit() {
  loading.value = true;

  try {
    await dbStore.saveEntry('filters', JSON.parse(JSON.stringify(filter.value)));
    onDialogOK();
  }
  catch(error) {
    Notify.create({
      html: true,
      message: `Something went wrong.<br>Technical details: ${error.message}`,
      color: 'negative',
    });
  }
  finally {
    loading.value = false;
  }
}
//#endregion

//#region Created
if (filter.value.filters.length === 0) {
  addFilter();
}
//#endregion
</script>
