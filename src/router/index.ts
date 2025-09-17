import { route } from 'quasar/wrappers';
import { createRouter, createWebHistory } from 'vue-router';
import routes from './routes';

export default route((/* { store, ssrContext } */) => {
  const Router = createRouter({
    scrollBehavior: () => ({
      left: 0,
      top: 0,
    }),
    history: createWebHistory(),
    routes,
  });

  return Router;
});
