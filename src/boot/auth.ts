import { boot } from 'quasar/wrappers';
import useDatabaseStore from 'stores/database';
import { Dark, Loading, Notify } from 'quasar';
import GitHub from 'src/lib/github';

export default boot(async({ redirect, router, }) => {
  Dark.set(true);

  const dbStore = useDatabaseStore();
  const setupRoute = router.resolve({
    name: 'setup',
  });
  const dashboardRoute = router.resolve({
    name: 'dashboard',
  });

  if (dbStore.settings.token) {
    Loading.show({
      group: 'boot',
      message: 'Validate GitHub Token...',
    });
    try {
      const response = await GitHub.fetchUser();
      if (!response.error && response.data?.login) {
        dbStore.authenticated = true;
      }
    }
    catch(error) {
      Notify.create({
        message: 'Something went wrong. Can\'t validate your GitHub Token. Maybe it\'s expired?',
        color: 'negative',
      });
      console.error(error);
    }
    Loading.hide('boot');
  }


  const urlPath = new URL(window.location.href).pathname;
  if (dbStore.authenticated && urlPath === setupRoute.fullPath) {
    redirect(window.location.origin + dashboardRoute.fullPath);
  }
  else if (!dbStore.authenticated && urlPath === dashboardRoute.fullPath) {
    redirect(window.location.origin + setupRoute.fullPath);
  }
});
