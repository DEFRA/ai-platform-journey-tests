import { browser } from '@wdio/globals'

import SignInPage from '#page-objects/sign-in.page'
import { mockUserHasRecord, setMockUserPlatformAdmin } from './mock-stack.js'

/**
 * Signs the mock person in as a Platform Admin or as a person without the
 * role. The portal learns the role at sign-in (it is what shows the Admin
 * link), so the role is set, the browser is cleared and the person signs in
 * again. The first ever sign-in only creates their record.
 * @param {'admin' | 'non-admin'} account
 */
export async function signInAs(account) {
  if (!(await mockUserHasRecord())) {
    await SignInPage.signIn()
  }

  await setMockUserPlatformAdmin(account === 'admin')
  await browser.deleteCookies()
  await SignInPage.signIn()
}

/**
 * Takes the role away from the person who is signed in, without signing in
 * again: the backend reads the role on every request.
 */
export function removePlatformAdminRole() {
  return setMockUserPlatformAdmin(false)
}
