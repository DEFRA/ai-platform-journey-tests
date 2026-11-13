import { browser, expect } from '@wdio/globals'

import AdminAddMemberPage from '#page-objects/admin/add-member.page'
import AdminRemoveMemberPage from '#page-objects/admin/remove-member.page'
import AdminTeamPage from '#page-objects/admin/team.page'
import { signInAs } from '#support/admin-session'
import { isMockStack, setTeamStatus } from '#support/mock-stack'
import { createTeam, newTeamNamed } from '#support/teams'

const describeOnMockStack = isMockStack() ? describe : describe.skip

// People in the backend's fictional directory (a fixture, never a real person).
const MEMBER = { search: 'journey test', displayName: 'Journey Test Member' }
const SECOND_ADMIN = { search: 'bashir', displayName: 'Bashir Nasser' }
const THIRD_ADMIN = { search: 'amelia', displayName: 'Amelia Hartley' }
const LATE_MEMBER = { search: 'cerys', displayName: 'Cerys Owen' }
// The person who signs in: they are in the directory because they have signed in.
const SIGNED_IN = { search: 'dev user', displayName: 'Dev User' }

const KEPT_ADMIN_TEXT = 'A team must keep at least one admin'

async function memberNamesAndRoles() {
  return (await AdminTeamPage.members()).map(({ name, role }) => ({
    name,
    role
  }))
}

describeOnMockStack(
  'Platform Admin: adding and removing the members of a team',
  () => {
    let teamSlug
    const team = newTeamNamed('members', 'JTM')

    before(async () => {
      await signInAs('admin')
      teamSlug = await createTeam(team)
    })

    describe('a Platform Admin who is in the team', () => {
      it('adds another Admin and shows them at once', async () => {
        await AdminAddMemberPage.open(teamSlug)
        await AdminAddMemberPage.add({ ...SECOND_ADMIN, role: 'admin' })

        await expect(AdminTeamPage.pageHeading).toHaveText(team.name)
        await expect(AdminTeamPage.notification).toHaveText(
          expect.stringContaining(`${SECOND_ADMIN.displayName} has been added`)
        )
        await expect(await memberNamesAndRoles()).toEqual(
          expect.arrayContaining([
            { name: 'Dev User (you)', role: 'Admin' },
            { name: SECOND_ADMIN.displayName, role: 'Admin' }
          ])
        )
      })

      it('removes themselves, as the team keeps another Admin', async () => {
        await AdminTeamPage.removeLink('Dev User').click()

        await expect(AdminRemoveMemberPage.warning).toHaveText(
          expect.stringContaining(
            'Removing someone does not change the team’s credentials'
          )
        )
        await AdminRemoveMemberPage.confirm()

        await expect(AdminTeamPage.notification).toHaveText(
          expect.stringContaining(`You have been removed from ${team.name}`)
        )
        await expect(await memberNamesAndRoles()).toEqual([
          { name: SECOND_ADMIN.displayName, role: 'Admin' }
        ])
      })
    })

    describe('a Platform Admin who is not in the team', () => {
      it('adds a person from the directory as a Member and shows them at once', async () => {
        await AdminTeamPage.addMemberButton.click()
        await AdminAddMemberPage.add({ ...MEMBER, role: 'user' })

        await expect(AdminTeamPage.notification).toHaveText(
          expect.stringContaining(`${MEMBER.displayName} has been added`)
        )
        await expect(await memberNamesAndRoles()).toEqual(
          expect.arrayContaining([{ name: MEMBER.displayName, role: 'Member' }])
        )
      })

      it('refuses adding a person who became a member in the meantime and changes nothing', async () => {
        // The directory search leaves out current members, so this is reached
        // only when the same person is added elsewhere after being chosen here.
        await AdminAddMemberPage.open(teamSlug)
        await AdminAddMemberPage.choosePerson(
          LATE_MEMBER.search,
          LATE_MEMBER.displayName
        )
        const firstWindow = await browser.getWindowHandle()

        await browser.newWindow(
          new URL(
            `/admin/teams/${teamSlug}/members/add`,
            await browser.getUrl()
          ).href
        )
        await AdminAddMemberPage.add({ ...LATE_MEMBER, role: 'user' })
        await expect(AdminTeamPage.notification).toBeDisplayed()
        await browser.closeWindow()
        await browser.switchToWindow(firstWindow)

        await AdminAddMemberPage.role('user').click()
        await AdminAddMemberPage.addButton.click()

        await expect(AdminAddMemberPage.errorSummary).toHaveText(
          expect.stringContaining(
            'This person is already a member of this team'
          )
        )
        await expect(browser).toHaveTitle(expect.stringContaining('Error:'))

        await AdminTeamPage.open(teamSlug)
        await expect(AdminTeamPage.memberRows).toBeElementsArrayOfSize(3)
      })

      it('refuses adding themselves and changes nothing', async () => {
        await AdminAddMemberPage.open(teamSlug)
        await AdminAddMemberPage.add({ ...SIGNED_IN, role: 'admin' })

        await expect(AdminAddMemberPage.errorSummary).toHaveText(
          expect.stringContaining('You cannot add yourself to a team')
        )

        await AdminTeamPage.open(teamSlug)
        await expect(AdminTeamPage.memberRows).toBeElementsArrayOfSize(3)
        await expect(await memberNamesAndRoles()).not.toContainEqual(
          expect.objectContaining({ name: expect.stringContaining('Dev User') })
        )
      })

      it('removes one of two Admins and the team keeps the other', async () => {
        await AdminAddMemberPage.open(teamSlug)
        await AdminAddMemberPage.add({ ...THIRD_ADMIN, role: 'admin' })
        await expect(AdminTeamPage.memberRows).toBeElementsArrayOfSize(4)

        await AdminTeamPage.removeLink(THIRD_ADMIN.displayName).click()
        await AdminRemoveMemberPage.confirm()

        await expect(AdminTeamPage.notification).toHaveText(
          expect.stringContaining(
            `${THIRD_ADMIN.displayName} has been removed from ${team.name}`
          )
        )
        await expect(await memberNamesAndRoles()).toEqual(
          expect.arrayContaining([
            { name: SECOND_ADMIN.displayName, role: 'Admin' },
            { name: MEMBER.displayName, role: 'Member' }
          ])
        )
        await expect(AdminTeamPage.memberRows).toBeElementsArrayOfSize(3)
      })

      it('refuses removing the last Admin, says what to do and keeps them', async () => {
        await AdminTeamPage.removeLink(SECOND_ADMIN.displayName).click()
        await AdminRemoveMemberPage.confirm()

        await expect(AdminRemoveMemberPage.errorSummary).toHaveText(
          expect.stringContaining(KEPT_ADMIN_TEXT)
        )
        await expect(browser).toHaveTitle(expect.stringContaining('Error:'))

        await AdminTeamPage.open(teamSlug)
        await expect(await memberNamesAndRoles()).toContainEqual({
          name: SECOND_ADMIN.displayName,
          role: 'Admin'
        })
      })

      it('cancels a removal and changes nothing', async () => {
        await AdminTeamPage.removeLink(MEMBER.displayName).click()
        await AdminRemoveMemberPage.cancelLink.click()

        await expect(AdminTeamPage.pageHeading).toHaveText(team.name)
        await expect(AdminTeamPage.memberRows).toBeElementsArrayOfSize(3)
      })
    })

    for (const status of ['disabled', 'pending-removal']) {
      describe(`a team that is ${status}`, () => {
        it('still lets a Platform Admin add and remove members', async () => {
          const stopped = newTeamNamed(`stopped ${status}`, 'JTS')
          const slug = await createTeam(stopped)
          await setTeamStatus(slug, status)

          await AdminAddMemberPage.open(slug)
          await AdminAddMemberPage.add({ ...MEMBER, role: 'user' })
          await expect(AdminTeamPage.notification).toHaveText(
            expect.stringContaining(`${MEMBER.displayName} has been added`)
          )

          await AdminTeamPage.removeLink(MEMBER.displayName).click()
          await AdminRemoveMemberPage.confirm()
          await expect(AdminTeamPage.notification).toHaveText(
            expect.stringContaining(
              `${MEMBER.displayName} has been removed from ${stopped.name}`
            )
          )
          await expect(AdminTeamPage.memberRows).toBeElementsArrayOfSize(1)
        })
      })
    }
  }
)
