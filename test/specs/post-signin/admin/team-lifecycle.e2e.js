import { browser, expect } from '@wdio/globals'

import AdminTabs from '#components/admin-tabs.component'
import TeamLockBanner from '#components/team-lock-banner.component'
import AdminActionDonePage from '#page-objects/admin/action-done.page'
import AdminAuditPage from '#page-objects/admin/audit.page'
import AdminChooseEnvironmentsPage from '#page-objects/admin/choose-environments.page'
import AdminDeploymentPage from '#page-objects/admin/deployment.page'
import AdminDeploymentsPage from '#page-objects/admin/deployments.page'
import AdminReasonPage from '#page-objects/admin/reason.page'
import AdminTeamPage from '#page-objects/admin/team.page'
import AdminTeamsPage from '#page-objects/admin/teams.page'
import EnvironmentPage from '#page-objects/environments/environment.page'
import ErrorPage from '#page-objects/error.page'
import TeamMembersPage from '#page-objects/teams/members.page'
import { removePlatformAdminRole, signInAs } from '#support/admin-session'
import { readEach } from '#support/element-values'
import {
  deployModel,
  ENVIRONMENT,
  ENVIRONMENT_LABEL
} from '#support/deployments'
import { isMockStack, setMockUserPlatformAdmin } from '#support/mock-stack'
import { createTeam, newTeamNamed } from '#support/teams'

const describeOnMockStack = isMockStack() ? describe : describe.skip

const MODEL_SLUG = 'gpt-4o'
const DISABLE_REASON = 'Journey test: the team is being investigated'
const MOST_REASON_CHARACTERS = 500

const DISABLED_BANNER = 'This team is disabled'
const BANNER_MESSAGE = 'You can view it but you cannot change it.'
const DISABLED_CHANGE_HEADING = 'You cannot change this team'
const DISABLED_CHANGE_MESSAGE =
  'This team is disabled. You can view it but not change it.'

describeOnMockStack(
  'Platform Admin: disabling and enabling a team',
  function () {
    // The set up deploys a model, which the mock orchestrator finishes in
    // about twenty seconds.
    this.timeout(Math.max(this.timeout(), 300000))

    const team = newTeamNamed('lifecycle', 'JLC')
    let slug
    let teamId

    before(async () => {
      await signInAs('admin')

      slug = await createTeam(team)
      await deployModel(slug, {
        modelSlug: MODEL_SLUG,
        purpose: 'Journey test: an environment to disable'
      })

      await AdminTeamPage.open(slug)
      teamId = await AdminTeamPage.teamIdFromAuditLink()
    })

    // Later specs sign in again, which sets the role; leave it as it was found
    // in case a test stopped while the person was without it.
    after(() => setMockUserPlatformAdmin(true))

    describe('disabling', () => {
      it('offers Disable team, and not Enable team, on an active team', async () => {
        await AdminTeamPage.open(slug)

        await expect(AdminTeamPage.summaryValue('Status')).toHaveText('Active')
        await expect(AdminTeamPage.disableTeamButton).toBeDisplayed()
        await expect(AdminTeamPage.enableTeamButton).not.toBeExisting()
        await expect(AdminTeamPage.disabledWarning).not.toBeExisting()
      })

      it('asks which environments as well, none ticked, and may be left with none', async () => {
        await AdminTeamPage.disableTeamButton.click()

        await expect(AdminChooseEnvironmentsPage.legend).toHaveText(
          'Which environments?'
        )
        await expect(await AdminChooseEnvironmentsPage.tickedLabels()).toEqual(
          []
        )
        // GOV.UK checkboxes are visually hidden inputs, so check they exist.
        await expect(
          AdminChooseEnvironmentsPage.checkbox(ENVIRONMENT)
        ).toBeExisting()

        await AdminChooseEnvironmentsPage.cancelLink.click()

        await expect(AdminTeamPage.pageHeading).toHaveText(team.name)
        await expect(AdminTeamPage.summaryValue('Status')).toHaveText('Active')
      })

      it('says what it does on the reason page and refuses an empty reason or one over 500 characters', async () => {
        await AdminTeamPage.disableTeamButton.click()
        await AdminChooseEnvironmentsPage.choose([ENVIRONMENT])
        await AdminChooseEnvironmentsPage.submitButton.click()

        await expect(AdminReasonPage.pageHeading).toHaveText('Disable team')
        await expect(AdminReasonPage.effect).toHaveText(
          expect.stringContaining(
            `People in ${team.name} can view it but not change it, and cannot change anything in ${ENVIRONMENT_LABEL}. The team is not told why.`
          )
        )
        await expect(AdminReasonPage.note).toHaveText(
          expect.stringContaining('Its credentials keep working.')
        )
        await expect(AdminReasonPage.note).not.toHaveText(
          expect.stringContaining('To stop calls')
        )

        await AdminReasonPage.submitWith('')

        await expect(AdminReasonPage.errorSummary).toHaveText(
          expect.stringContaining('Enter a reason')
        )
        await expect(browser).toHaveTitle(expect.stringContaining('Error:'))

        const tooLong = 'x'.repeat(MOST_REASON_CHARACTERS + 1)

        await AdminReasonPage.submitWith(tooLong)

        await expect(AdminReasonPage.errorSummary).toHaveText(
          expect.stringContaining(
            `Reason must be ${MOST_REASON_CHARACTERS} characters or fewer`
          )
        )
        await expect(AdminReasonPage.reasonField).toHaveValue(tooLong)

        await AdminTeamPage.open(slug)
        await expect(AdminTeamPage.summaryValue('Status')).toHaveText('Active')
      })

      it('disables the team and the environment ticked, and confirms both', async () => {
        await AdminTeamPage.disableTeamButton.click()
        await AdminChooseEnvironmentsPage.choose([ENVIRONMENT])
        await AdminChooseEnvironmentsPage.submitButton.click()
        await AdminReasonPage.submitWith(DISABLE_REASON)

        await expect(AdminActionDonePage.panelTitle).toHaveText('Team disabled')
        await expect(AdminActionDonePage.panel).toHaveText(
          expect.stringContaining(`${ENVIRONMENT_LABEL} also disabled`)
        )
        await expect(AdminActionDonePage.effect).toHaveText(
          expect.stringContaining('Its credentials keep working.')
        )
      })

      it('shows Disabled on the team, on its environment and in the Teams list', async () => {
        await AdminTeamPage.open(slug)

        await expect(AdminTeamPage.summaryValue('Status')).toHaveText(
          'Disabled'
        )
        await expect(AdminTeamPage.disabledWarning).toHaveText(
          expect.stringContaining('This team is disabled.')
        )
        await expect(AdminTeamPage.environments).toHaveText(
          expect.stringContaining('Disabled')
        )
        await expect(
          AdminTeamPage.environmentDisabledTags
        ).toBeElementsArrayOfSize({ gte: 1 })
        await expect(AdminTeamPage.enableTeamButton).toBeDisplayed()
        await expect(AdminTeamPage.disableTeamButton).not.toBeExisting()

        await AdminTeamsPage.open(`?search=${encodeURIComponent(team.name)}`)
        await expect(AdminTeamsPage.status(team.name)).toHaveText('Disabled')
      })

      it('shows Disabled on the team’s deployment, with its credentials still working', async () => {
        await AdminDeploymentsPage.open(
          `?search=${encodeURIComponent(team.name)}`
        )
        await AdminDeploymentsPage.teamLink(team.name).click()

        await expect(
          AdminDeploymentPage.summaryValue('Team status')
        ).toHaveText('Disabled')
        await expect(AdminDeploymentPage.environmentDisabled).toBeDisplayed()
        await expect(AdminDeploymentPage.summaryValue('Credential')).toHaveText(
          'Active'
        )
      })
    })

    describe('a person in the disabled team', () => {
      before(async () => {
        // The same person, without the Platform Admin role: the backend reads
        // it on every request, so this is a team Admin and nothing more.
        await removePlatformAdminRole()
      })

      it('sees the banner and the status on the team’s pages, and Add a member greyed out', async () => {
        await TeamMembersPage.open(slug)

        await expect(TeamLockBanner.heading).toHaveText(DISABLED_BANNER)
        await expect(TeamLockBanner.root).toHaveText(
          expect.stringContaining(BANNER_MESSAGE)
        )
        await expect(TeamMembersPage.status).toHaveText(
          expect.stringContaining('Disabled')
        )
        await expect(TeamMembersPage.addMemberButton).toBeDisplayed()
        await expect(TeamMembersPage.addMemberButton).not.toBeClickable()
        await expect(TeamMembersPage.addMemberButton).toHaveAttribute(
          'aria-disabled',
          'true'
        )
      })

      it('sees the banner on the environment, with Deploy a model and Add a client secret greyed out', async () => {
        await EnvironmentPage.open(slug, ENVIRONMENT)

        await expect(TeamLockBanner.heading).toHaveText(DISABLED_BANNER)
        await expect(EnvironmentPage.deployButton).toHaveAttribute(
          'aria-disabled',
          'true'
        )
        await expect(EnvironmentPage.addClientSecretButton).toHaveAttribute(
          'aria-disabled',
          'true'
        )
      })

      it('is told “You cannot change this team” when they try to change it, and nothing changes', async () => {
        await browser.url(`/teams/${slug}/members/add`)

        await expect(ErrorPage.pageHeading).toHaveText(DISABLED_CHANGE_HEADING)
        await expect(ErrorPage.plainMessage).toHaveText(DISABLED_CHANGE_MESSAGE)
        await expect(browser).toHaveTitle(
          expect.stringContaining(DISABLED_CHANGE_HEADING)
        )
        await expect(ErrorPage.actionLink).toHaveText('Back to the members')

        await TeamMembersPage.open(slug)
        await expect(TeamMembersPage.memberRows).toBeElementsArrayOfSize(1)
      })

      it('is not told why or by whom, anywhere', async () => {
        await EnvironmentPage.open(slug, ENVIRONMENT)
        const text = await browser.$('main').getText()

        await expect(text).not.toContain(DISABLE_REASON)
        await expect(text).not.toContain('Platform Admin')
      })
    })

    describe('enabling', () => {
      before(async () => {
        await setMockUserPlatformAdmin(true)
      })

      it('enables the team when no environment is ticked, and the environment stays disabled', async () => {
        await AdminTeamPage.open(slug)
        await AdminTeamPage.enableTeamButton.click()
        await AdminChooseEnvironmentsPage.choose([])
        await AdminChooseEnvironmentsPage.submitButton.click()

        await expect(AdminTeamPage.pageHeading).toHaveText(team.name)
        await expect(AdminTeamPage.notification).toHaveText(
          expect.stringContaining('Team enabled.')
        )
        await expect(AdminTeamPage.summaryValue('Status')).toHaveText('Active')
        // The environment is still locked, so Enable team is still offered.
        await expect(AdminTeamPage.enableTeamButton).toBeDisplayed()
      })

      it('asks again, with the error shown, when nothing is ticked on an enabled team', async () => {
        await AdminTeamPage.enableTeamButton.click()

        await expect(AdminChooseEnvironmentsPage.hint).toHaveText(
          expect.stringContaining('The team is already enabled.')
        )

        await AdminChooseEnvironmentsPage.choose([])
        await AdminChooseEnvironmentsPage.submitButton.click()

        await expect(AdminChooseEnvironmentsPage.errorSummary).toHaveText(
          expect.stringContaining('Choose at least one environment to unlock')
        )
        await expect(AdminChooseEnvironmentsPage.fieldError).toHaveText(
          expect.stringContaining('Choose at least one environment to unlock')
        )
        await expect(browser).toHaveTitle(expect.stringContaining('Error:'))
        await expect(
          AdminChooseEnvironmentsPage.checkbox(ENVIRONMENT)
        ).toBeExisting()

        // Nothing was changed: the environment is still disabled.
        await AdminTeamPage.open(slug)
        await expect(AdminTeamPage.summaryValue('Status')).toHaveText('Active')
        await expect(AdminTeamPage.enableTeamButton).toBeDisplayed()
      })

      it('offers the disabled environments to unlock, all ticked, and lifts the lock', async () => {
        await AdminTeamPage.open(slug)
        await AdminTeamPage.enableTeamButton.click()

        await expect(AdminChooseEnvironmentsPage.legend).toHaveText(
          'Which environments?'
        )
        await expect(await AdminChooseEnvironmentsPage.tickedLabels()).toEqual([
          ENVIRONMENT_LABEL
        ])

        await AdminChooseEnvironmentsPage.submitButton.click()

        await expect(AdminTeamPage.pageHeading).toHaveText(team.name)
        // The team was enabled by the test before, so Enable only unlocks the
        // environment and does not say "Team enabled".
        await expect(AdminTeamPage.notification).toHaveText(
          expect.stringContaining(`${ENVIRONMENT_LABEL} unlocked.`)
        )
        await expect(AdminTeamPage.notification).not.toHaveText(
          expect.stringContaining('Team enabled')
        )
        await expect(AdminTeamPage.summaryValue('Status')).toHaveText('Active')
        await expect(AdminTeamPage.disabledWarning).not.toBeExisting()
        await expect(AdminTeamPage.disableTeamButton).toBeDisplayed()
        await expect(AdminTeamPage.enableTeamButton).not.toBeExisting()
      })

      it('lets the team change things again: no banner and Add a member is live', async () => {
        await removePlatformAdminRole()

        await TeamMembersPage.open(slug)

        await expect(TeamLockBanner.root).not.toBeExisting()
        await expect(TeamMembersPage.addMemberButton).toBeClickable()

        await browser.url(`/teams/${slug}/members/add`)
        await expect(ErrorPage.pageHeading).not.toHaveText(
          DISABLED_CHANGE_HEADING
        )
      })

      it('shows both changes in Recent changes, newest first, as the platform team’s', async () => {
        await EnvironmentPage.open(slug, ENVIRONMENT)

        const changes = await readEach(
          await EnvironmentPage.recentChanges,
          (row) => row.getText()
        )
        const enabled = changes.findIndex((text) =>
          text.includes('Team enabled by the platform team')
        )
        const disabled = changes.findIndex((text) =>
          text.includes('Team disabled by the platform team')
        )

        await expect(enabled).toBeGreaterThanOrEqual(0)
        await expect(disabled).toBeGreaterThanOrEqual(0)
        await expect(enabled).toBeLessThan(disabled)
        await expect(changes[disabled]).not.toContain(DISABLE_REASON)
      })
    })

    describe('the audit log', () => {
      before(async () => {
        await setMockUserPlatformAdmin(true)
      })

      it('records disabling and enabling with who did it and the reason', async () => {
        await AdminAuditPage.open(`?team=${teamId}`)
        await expect(AdminTabs.currentTab).toHaveText('Audit log')
        const events = await AdminAuditPage.events()

        const disabled = events.find((event) =>
          event.action.startsWith('Disabled a team')
        )
        const enabled = events.find((event) =>
          event.action.startsWith('Enabled a team')
        )

        for (const event of [disabled, enabled]) {
          await expect(event).toEqual(
            expect.objectContaining({ team: team.name, outcome: 'Done' })
          )
          await expect(event.who).toContain('Dev User')
          await expect(event.who).toContain('Platform Admin')
        }

        await expect(disabled.action).toContain(`Reason: ${DISABLE_REASON}`)
      })
    })
  }
)
