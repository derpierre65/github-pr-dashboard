<template>
  <div class="tw:flex tw:p-2">
    <span class="tw:shrink-0">
      <q-icon v-if="item.isDraft" name="fas fa-code-pull-request" color="grey-6" />
      <!--      <q-icon v-else-if="item.merged" name="fas fa-code-merge" color="purple-4" />-->
      <q-icon v-else-if="item.state === 'OPEN'" name="fas fa-code-pull-request" color="green-6" />
    </span>

    <div class="tw:flex-auto tw:min-w-0 tw:px-2">
      <div class="tw:space-x-1">
        <span class="tw:text-[rgb(145,152,161)]">{{ item.org }}/{{ item.repo }}</span>
        <a v-bind="linkProps" class="tw:text-base text-weight-bold">
          {{ item.title }}
        </a>

        <q-icon v-if="item.statusCheckRollup === 'SUCCESS'" name="fas fa-check" color="green" />
        <q-icon v-else-if="item.statusCheckRollup === 'PENDING'" name="fas fa-circle" color="orange" size="8px" />
        <q-icon v-else-if="item.statusCheckRollup === 'FAILURE'" name="fas fa-times" color="red" />

        <span>
          <q-badge
            v-for="label in item.labels"
            :key="label.id"
            class="tw:ml-1 github-label cursor-pointer"
            :style="hexToRgbHsl(label.color)"
            :label="label.name"
            rounded
            @click="$emit('clickLabel', label.name)"
          />
        </span>
      </div>
      <div class="text-grey-6 tw:text-[12px]!">
        <span class="q-pr-xs">#{{ item.number }} opened {{ date }} by <strong
          class="cursor-pointer"
          @click="$emit('clickAuthor', item.author.login)"
        >{{ item.author.login }}</strong></span> •&nbsp;

        <span v-if="item.calculatedReviewStatus === 'approved'">
          <q-icon name="fas fa-check-circle" color="green" /> Approved
        </span>
        <span v-else-if="item.calculatedReviewStatus === 'changes_requested'">
          <q-icon name="fas fa-times-circle" color="red" /> Changes requested
        </span>
        <span v-else-if="item.calculatedReviewStatus === 'pending'">
          <q-icon name="fas fa-minus-circle" color="orange" /> Review required
        </span>
        <span>•&nbsp;Reviewers: </span>
        <ul class="inline-list comma-separated tw:inline-flex!">
          <li
            v-for="reviewer in reviewers"
            class="cursor-pointer q-gutter-x-xs"
            @click="$emit('clickAuthor', reviewer.name)"
          >
            <q-icon
              v-if="reviewer.state === 'APPROVED'"
              name="fas fa-check"
            />
            <q-icon
              v-else-if="reviewer.state === 'PENDING'"
              name="fas fa-circle"
              size="8px"
            />
            <q-icon
              v-else-if="reviewer.state === 'CHANGES_REQUESTED'"
              name="fas fa-times"
            />
            <span>{{ reviewer.name }}</span>
            <q-tooltip>{{ reviewer.state }}</q-tooltip>
          </li>
        </ul>
      </div>
    </div>

    <div class="tw:shrink-0 tw:grid tw:grid-cols-2 tw:gap-2 tw:min-w-[120px]">
      <span>
        <template v-if="item.assignee">
          <q-avatar size="sm">
            <q-img :src="item.assignee.avatar_url" />
          </q-avatar>
          <q-tooltip>Assignee: {{ item.assignee.login }}</q-tooltip>
        </template>
      </span>

      <span class="text-right">
        <a v-if="item.totalCommentsCount" v-bind="linkProps" class="tw:space-x-1 text-right">
          <span class="text-small text-bold">{{ item.totalCommentsCount }}</span>
          <q-icon name="fas fa-comment" />
        </a>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import dayjs from 'dayjs';

//#region Composable & Prepare
const props = defineProps<{
  item: GitHubPullRequest;
}>();

defineEmits<{
  clickLabel: [value: string];
  clickAuthor: [value: string];
}>();
//#endregion

//#region Data
//#endregion

//#region Computed
const linkProps = computed(() => {
  return {
    href: props.item.url,
    target: '_blank',
    rel: 'noopener noreferrer',
  };
});

const reviewers = computed(() => {
  return [
    ...props.item.latestOpinionatedReviews.map((review) => {
      return {
        name: review.author.login,
        state: review.state,
        title: review.state === 'CHANGES_REQUESTED' ? 'Changes requested' : 'Approved',
      };
    }),
    ...props.item.requestedReviewers.map((reviewer) => {
      return {
        name: reviewer.login,
        state: 'PENDING',
        title: 'Review required',
      };
    }),
  ];
});

const date = computed(() => {
  return dayjs(props.item.createdAt).fromNow();
});
//#endregion

//#region Watch
//#endregion

//#region Lifecycle Events
//#endregion

//#region Methods
function hexToRgbHsl(hex: string) {
  hex = hex.replace('#', '');

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / delta) % 6;
    }
    else if (max === gNorm) {
      h = (bNorm - rNorm) / delta + 2;
    }
    else {
      h = (rNorm - gNorm) / delta + 4;
    }
  }
  h = Math.round(h * 60);
  if (h < 0) {
    h += 360;
  }

  const l = (max + min) / 2;

  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
  }

  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return {
    // RGB
    '--label-r': r,
    '--label-g': g,
    '--label-b': b,
    // HSL
    '--label-h': h,
    '--label-s': sPercent,
    '--label-l': lPercent,
  };
}


//#endregion

//#region Created
//#endregion
</script>

<style scoped>
.github-label {
  --label-r: 255;
  --label-g: 0;
  --label-b: 0;
  --label-h: 0;
  --label-s: 0;
  --label-l: 0;

  --lightness-threshold: 0.6;
  --perceived-lightness: calc(((var(--label-r) * 0.2126) + (var(--label-g) * 0.7152) + (var(--label-b) * 0.0722)) / 255);
  --lightness-switch: max(0,min(calc((var(--perceived-lightness) - var(--lightness-threshold)) * -1000),1));
  --lighten-by: calc(((var(--lightness-threshold) - var(--perceived-lightness)) * 100) * var(--lightness-switch));

  color: hsl(var(--label-h),calc(var(--label-s) * 1%),calc((var(--label-l) + var(--lighten-by)) * 1%));
  background: rgba(var(--label-r),var(--label-g),var(--label-b),0.18) !important;
  border: hsla(var(--label-h),calc(var(--label-s) * 1%),calc((var(--label-l) + var(--lighten-by)) * 1%),0.3) 1px solid;
}
</style>
