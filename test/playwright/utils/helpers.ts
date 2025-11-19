import { test } from '@playwright/test';

function testAsGuest() {
  test.use({
    storageState: {
      cookies: [],
      origins: [],
    },
  });
}

export {
  testAsGuest,
};
