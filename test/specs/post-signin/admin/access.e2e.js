import { browser, expect } from '@wdio/globals'

import ServiceNavigation from '#components/service-navigation.component'
import AdminTabs from '#components/admin-tabs.component'
import ErrorPage from '#page-objects/error.page'
import AdminTeamsPage from '#page-objects/admin/teams.page'
import AdminAuditPage from '#page-objects/admin/audit.page'
import { signInAs, removePlatformAdminRole } from '#support/admin-session'
import { isMockStack } from '#support/mock-stack'

// Needs the local stack (mock sign-in) because it gives and takes away the
// Platform Admin role in the local MongoDB. See the README.
const describeOnMockStack = isMockStack() ? describe : describe.skip

const REFUSAL_HEADING = 'Only a Platform Admin can use this page'

describeOnMockStack('Platform Admin: who can use the Admin area', () => {
  describe('a Platform Admin', () => {
    before(async () => {
      await signInAs('admin')
    })

    it('sees the Admin link in the navigation', async () => {
      await expect(await ServiceNavigation.linkTexts()).toContain('Admin')
    })

    it('opens the Admin area on the Teams tab and sees the tabs with the current one marked', async () => {
      await ServiceNavigation.link('Admin').click()

      await expect(browser).toHaveUrl(expect.stringContaining('/admin/teams'))
      await expect(AdminTeamsPage.pageHeading).toHaveText('Teams')
      await expect(await AdminTabs.tabTexts()).toEqual(
        expect.arrayContaining(['Teams', 'Audit log'])
      )
      await expect(AdminTabs.currentTab).toHaveText('Teams')
    })

    it('moves to the Audit log tab and marks it as the current one', async () => {
      await AdminTabs.tab('Audit log').click()

      await expect(browser).toHaveUrl(expect.stringContaining('/admin/audit'))
      await expect(AdminAuditPage.pageHeading).toHaveText('Audit log')
      await expect(AdminTabs.currentTab).toHaveText('Audit log')
    })
  })

  describe('a person who is not a Platform Admin', () => {
    before(async () => {
      await signInAs('non-admin')
    })

    it('does not see the Admin link', async () => {
      await expect(await ServiceNavigation.linkTexts()).not.toContain('Admin')
    })

    for (const [page, path] of [
      ['the Teams tab', '/admin/teams'],
      ['the Audit log tab', '/admin/audit'],
      ['a team page', '/admin/teams/no-such-team'],
      ['the add a member page', '/admin/teams/no-such-team/members/add']
    ]) {
      it(`is refused ${page} with the page that says who can use it`, async () => {
        await browser.url(path)

        await expect(ErrorPage.pageHeading).toHaveText(REFUSAL_HEADING)
        await expect(browser).toHaveTitle(
          expect.stringContaining(REFUSAL_HEADING)
        )
        await expect(AdminTabs.root).not.toBeDisplayed()
      })
    }
  })

  describe('a Platform Admin who then loses the role', () => {
    before(async () => {
      await signInAs('admin')
    })

    it('is refused at the next request, without signing in again, and the Admin link goes', async () => {
      await AdminTeamsPage.open()
      await expect(AdminTeamsPage.pageHeading).toHaveText('Teams')

      await removePlatformAdminRole()

      await AdminTeamsPage.open()
      await expect(ErrorPage.pageHeading).toHaveText(REFUSAL_HEADING)

      await browser.url('/')
      await expect(await ServiceNavigation.linkTexts()).not.toContain('Admin')
    })
  })
})
