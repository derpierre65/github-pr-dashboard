<template>
  <q-dialog ref="dialogRef" persistent no-shake>
    <q-card class="no-shadow tw:!max-w-[600px] full-width">
      <q-card-section class="tw:flex tw:bg-stone-800 q-py-sm items-center tw:gap-2">
        <div class="tw:min-w-0 tw:flex-auto">
          <div class="text-grey-6 tw:text-xs">
            {{ pullRequest.nameWithOwner }} #{{ pullRequest.number }}
          </div>
          <div class="ellipsis">
            {{ pullRequest.title }}
          </div>
        </div>
        <q-icon name="fas fa-times cursor-pointer" @click="onDialogCancel" />
      </q-card-section>

      <q-card-section>
        <q-input
          v-model="noteText"
          type="textarea"
          label="Private note"
          hint="Stored locally in your browser only."
          rows="5"
          autofocus
          autogrow
          dense
          outlined
        />
      </q-card-section>

      <q-card-actions align="right" class="tw:bg-stone-800">
        <q-btn
          v-if="hasExistingNote"
          :loading="loading"
          label="Delete"
          color="red"
          flat
          no-caps
          @click="deleteNote"
        />
        <q-space />
        <q-btn
          label="Cancel"
          flat
          no-caps
          @click="onDialogCancel"
        />
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
import { Notify, useDialogPluginComponent } from 'quasar';
import { ref } from 'vue';
import useDatabaseStore from 'stores/database';

//#region Composable & Prepare
const props = defineProps<{
  pullRequest: GitHubPullRequest;
}>();

const dbStore = useDatabaseStore();
const {
  dialogRef,
  onDialogCancel,
  onDialogOK,
} = useDialogPluginComponent();
//#endregion

//#region Data
const noteText = ref(props.pullRequest.note || '');
const hasExistingNote = ref(Boolean(props.pullRequest.note));
const loading = ref(false);
//#endregion

//#region Methods
function updatePullRequestInStore(updatedPullRequest: GitHubPullRequest) {
  const index = dbStore.pullRequests.findIndex((pullRequest) => pullRequest.id === updatedPullRequest.id);
  if (index !== -1) {
    dbStore.pullRequests[index] = updatedPullRequest;
  }
}

function clonePullRequest(): GitHubPullRequest {
  // Strip Vue reactive proxies (IndexedDB's structured clone can't clone them).
  // JSON round-trip loses the Date type on fetchedAt, so we restore it explicitly.
  const cloned = JSON.parse(JSON.stringify(props.pullRequest)) as GitHubPullRequest;
  cloned.fetchedAt = new Date(cloned.fetchedAt);

  return cloned;
}

async function persist(updatedPullRequest: GitHubPullRequest) {
  loading.value = true;

  try {
    await dbStore.saveEntry('pull_requests', updatedPullRequest);
    updatePullRequestInStore(updatedPullRequest);
    onDialogOK();
  }
  catch(error) {
    Notify.create({
      message: `Could not save note: ${error.message}`,
      color: 'negative',
    });
  }
  finally {
    loading.value = false;
  }
}

function submit() {
  const trimmed = noteText.value.trim();
  const updatedPullRequest = clonePullRequest();

  if (trimmed) {
    updatedPullRequest.note = trimmed;
  }
  else {
    delete updatedPullRequest.note;
  }

  return persist(updatedPullRequest);
}

function deleteNote() {
  const updatedPullRequest = clonePullRequest();
  delete updatedPullRequest.note;

  return persist(updatedPullRequest);
}
//#endregion
</script>
