<template>
  <div class="tw:flex tw:flex-col tw:divide-y-[1px] tw:divide-[#3d444db3] tw:border-[#3d444db3] tw:border-2 q-mt-md">
    <PullRequest
      v-for="pullRequest in items"
      :key="pullRequest.id"
      :item="pullRequest"
      @click-author="$emit('clickAuthor', $event)"
      @click-label="$emit('clickLabel', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import PullRequest from 'components/PullRequest.vue';

defineProps<{
  items: GitHubPullRequest[];
}>();

defineEmits<{
  clickLabel: [value: string];
  clickAuthor: [value: string];
}>();
</script>
