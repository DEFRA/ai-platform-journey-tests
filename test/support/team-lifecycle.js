import { expect } from '@wdio/globals'

import AdminActionDonePage from '#page-objects/admin/action-done.page'
import AdminChooseEnvironmentsPage from '#page-objects/admin/choose-environments.page'
import AdminReasonPage from '#page-objects/admin/reason.page'
import AdminTeamPage from '#page-objects/admin/team.page'

/**
 * Disables a team through the Platform Admin's real pages: the team's page,
 * which environments to disable as well (none by default), a reason, and the
 * confirmation. The person signed in must be a Platform Admin.
 * @param {string} teamSlug
 * @param {{reason?: string, environments?: string[]}} [options] - The codes of
 *   the environments to disable with the team.
 */
export async function disableTeam(
  teamSlug,
  { reason = 'Disabled by the journey tests', environments = [] } = {}
) {
  await AdminTeamPage.open(teamSlug)
  await AdminTeamPage.disableTeamButton.click()

  if (environments.length > 0) {
    await AdminChooseEnvironmentsPage.choose(environments)
  }

  await AdminChooseEnvironmentsPage.submitButton.click()
  await AdminReasonPage.submitWith(reason)

  await expect(AdminActionDonePage.panelTitle).toHaveText('Team disabled')
}
