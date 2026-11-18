import { expect } from '@wdio/globals'

import AdminAddMemberPage from '#page-objects/admin/add-member.page'
import AdminTeamPage from '#page-objects/admin/team.page'
import AdminWithoutScript from '#page-objects/admin/admin-without-script.page'
import { signInAs } from '#support/admin-session'
import { openWithoutScript } from '#support/no-script-session'
import { isMockStack } from '#support/mock-stack'
import { createTeam, newTeamNamed } from '#support/teams'

const describeOnMockStack = isMockStack() ? describe : describe.skip

const MEMBER = { search: 'journey test', displayName: 'Journey Test Member' }
const MEMBER_ADDED = 'team.addMember'

describeOnMockStack(
  'Platform Admin: the search forms with script switched off',
  function () {
    // Starts a second browser, and the set up adds a team and a member.
    this.timeout(180000)

    const team = newTeamNamed('no script', 'JNS')

    before(async () => {
      await signInAs('admin')

      const slug = await createTeam(team)

      await AdminAddMemberPage.open(slug)
      await AdminAddMemberPage.add({ ...MEMBER, role: 'user' })
      await expect(AdminTeamPage.notification).toBeDisplayed()
    })

    it('finds a team by part of its name', async () => {
      const session = await openWithoutScript('/admin/teams')

      try {
        // Script really is off, as GOV.UK Frontend sets this class from script.
        await expect(AdminWithoutScript.body(session)).not.toHaveElementClass(
          'js-enabled'
        )

        await AdminWithoutScript.searchTeams(session, team.name)

        await expect(await AdminWithoutScript.teamNames(session)).toEqual([
          team.name
        ])
      } finally {
        await session.deleteSession()
      }
    })

    it('shows only the action chosen in the audit log', async () => {
      const session = await openWithoutScript('/admin/audit')

      try {
        await AdminWithoutScript.filterAuditByAction(session, MEMBER_ADDED)

        const actions = await AdminWithoutScript.auditActions(session)

        await expect(actions.length).toBeGreaterThan(0)
        await expect(
          actions.every((action) => action.includes('Added a member'))
        ).toBe(true)
      } finally {
        await session.deleteSession()
      }
    })
  }
)
