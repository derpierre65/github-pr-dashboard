<template>
  <q-page class="flex flex-center">
    <q-card class="no-shadow tw:max-w-[800px]">
      <q-card-section class="q-gutter-y-md">
        <div class="text-center q-gutter-y-md">
          <q-icon name="fab fa-github" size="xl" />

          <h6 v-test:setup-title>
            Welcome to GitHub Pull Request Dashboard
          </h6>

          <p>To get access to this page, you need to create a personal access token with the <code>repo</code> permissions.</p>
        </div>

        <q-separator />

        <p><strong>Quick method</strong>: If you have the GitHub CLI installed, run:</p>
        <q-banner class="tw:bg-neutral-900!">
          <span>gh auth token</span>
        </q-banner>

        <p>Then paste the token below.</p>

        <q-separator />

        <p><strong>Alternative</strong>: Visit GitHub Personal Access Tokens to create a longer-lived token.</p>
        <ul>
          <li>
            <a
              href="https://github.com/settings/personal-access-tokens"
              target="_blank"
              rel="noopener noreferrer"
              class="link"
            >Fine-grained personal access tokens</a>: You can only get access to repositories of one organization or user.
          </li>
          <li>
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              class="link"
            >Personal access tokens (classic)</a>: This token will have access to all your repositories.
          </li>
        </ul>

        <q-separator />

        <div class="flex q-gutter-x-xs">
          <InputPassword
            v-model="token"
            class="tw:flex-auto"
            label="GitHub Personal Access Token"
            outlined
            @keyup.enter="validateToken"
          />
          <q-btn
            :disable="!token.trim().length"
            color="primary"
            label="Login"
            no-caps
            @click="validateToken"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import InputPassword from 'components/InputPassword.vue';
import { ref } from 'vue';
import { Loading, Notify } from 'quasar';
import GitHub, { GitHubResponse } from 'src/lib/github';
import useDatabaseStore from 'stores/database';
import { useRouter } from 'vue-router';
import { noop } from 'src/lib/core';

const dbStore = useDatabaseStore();
const router = useRouter();

const token = ref('');

async function validateToken() {
  if (!token.value.trim()) {
    return;
  }

  dbStore.settings.token = token.value;

  Loading.show({
    group: 'validateToken',
  });

  const response: GitHubResponse = await GitHub.fetchUser().catch((error) => error);
  Loading.hide('validateToken');

  if (response.error) {
    dbStore.settings.token = '';

    Notify.create({
      message: 'Your token is invalid.',
      color: 'negative',
    });
    return;
  }

  dbStore.settings.username = response.data.login;
  window.localStorage.setItem('pr_dashboard_settings', JSON.stringify(dbStore.settings));
  dbStore.authenticated = true;

  router.push({
    name: 'dashboard',
  }).catch(noop);
}
</script>
