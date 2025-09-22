<template>
  <q-dialog ref="dialogRef" persistent no-shake>
    <q-card class="no-shadow tw:max-w-[800px]! full-width">
      <q-card-section class="tw:flex tw:bg-stone-800 q-py-sm items-center">
        <span>Filter</span>
        <q-space />
        <q-icon name="fas fa-times cursor-pointer" @click="onDialogCancel" />
      </q-card-section>

      <q-card-section class="q-gutter-y-md">
        <q-input
          v-model="filter.name"
          label="Filter Name"
          hint="You can create groups of filters if you use a slash in the name."
          dense
        />

        <q-toggle
          :model-value="filter.showAsNotification"
          label="Show Notification if filter count increases"
          dense
          @update:model-value="requestNotificationPermission"
        />

        <q-input
          v-if="filter.showAsNotification"
          v-model="filter.notificationText"
          label="Custom Notification Text"
          dense
        />
        <div v-if="filter.showAsNotification">
          You can use some variables in your notification text:
          <ul class="tw:list-disc tw:pl-4">
            <li>%filter% - Name of the filter.</li>
            <li>%newValue% - New count of the filter.</li>
            <li>%oldValue% - Old count of the filter.</li>
          </ul>
        </div>

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
  showAsNotification: false,
  notificationText: '',
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

function requestNotificationPermission(modelValue: boolean) {
  if (modelValue) {
    return Notification.requestPermission((status) => {
      if (status === 'granted') {
        filter.value.showAsNotification = true;
      }
    });
  }

  filter.value.showAsNotification = false;
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
