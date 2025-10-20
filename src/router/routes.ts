import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        name: 'dashboard',
        path: '',
        component: () => import('pages/IndexPage.vue'),
      },
      {
        name: 'setup',
        path: 'setup',
        component: () => import('pages/SetupPage.vue'),
      },
      {
        name: 'help-filter',
        path: 'help/filter',
        component: () => import('pages/Help/HelpFilterPage.vue'),
      },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
