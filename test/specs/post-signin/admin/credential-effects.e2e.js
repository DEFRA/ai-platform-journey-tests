import { browser, expect } from '@wdio/globals'

import TeamLockBanner from '#components/team-lock-banner.component'
import AdminActionDonePage from '#page-objects/admin/action-done.page'
import AdminAuditPage from '#page-objects/admin/audit.page'
import AdminChooseEnvironmentsPage from '#page-objects/admin/choose-environments.page'
import AdminDeploymentPage from '#page-objects/admin/deployment.page'
import AdminDeploymentsPage from '#page-objects/admin/deployments.page'
import AdminReasonPage from '#page-objects/admin/reason.page'
import AdminTeamPage from '#page-objects/admin/team.page'
import EnvironmentPage from '#page-objects/environments/environment.page'
import FederatePage from '#page-objects/environments/federate.page'
import ErrorPage from '#page-objects/error.page'
import { removePlatformAdminRole, signInAs } from '#support/admin-session'
import {
  addClientSecret,
  deployModel,
  ENVIRONMENT,
  ENVIRONMENT_LABEL
} from '#support/deployments'
import {
  answerFederateQuestions,
  federateCdpService
} from '#support/federation'
import { journeyData } from '#support/journey-data'
import { isMockStack, setMockUserPlatformAdmin } from '#support/mock-stack'
import { createTeam, newTeamNamed } from '#support/teams'

const describeOnMockStack = isMockStack() ? describe : describe.skip

const MODEL_SLUG = 'gpt-4o'
const REFUSED = 'journey-blocked'
const POLL_MS = 3000
const REMOVE_REASON = 'Journey test: this application is no longer wanted'
const DISABLE_REASON = 'Journey test: the credentials are being misused'

const READY = 'Ready to use'
const CREDENTIALS_HEADING = 'Credentials are disabled'
const CREDENTIALS_MESSAGE =
  'Your team’s credentials are disabled here. You cannot add, view or rotate a client secret, or create or change a passwordless credential. You can still revoke a client secret and remove an application.'
const FEDERATE_REFUSED =
  'Infradev: credentials are disabled, so you cannot create a passwordless credential there'

describeOnMockStack(
  'Platform Admin: removing a federated application, and a team whose credentials are disabled',
  function () {
    // The set up deploys a model (about twenty seconds), adds a client secret
    // and makes two passwordless credentials, each of which the mock
    // orchestrator finishes in about as long.
    this.timeout(Math.max(this.timeout(), 600000))

    const team = newTeamNamed('effects', 'JEF')
    const stamp = team.name.split(' ')[2]
    // A CDP service is trusted by one team at a time, so a rerun on the same
    // database must not reuse the names an earlier run left in use.
    const REMOVED = `journey-api-${stamp}`
    const KEPT = `journey-worker-${stamp}`
    let slug
    let teamId

    // The deployment page of the team in the environment, opened from the list
    // as an admin does: its address holds the team's ID, not its slug.
    async function openDeployment() {
      await AdminDeploymentsPage.open(`?search=${stamp}`)
      await AdminDeploymentsPage.teamLink(team.name).click()
      await expect(AdminDeploymentPage.pageHeading).toHaveText(team.name)
    }

    before(async () => {
      await signInAs('admin')

      slug = await createTeam(team)
      await deployModel(slug, {
        modelSlug: MODEL_SLUG,
        purpose: 'Journey test: a deployment to hold credentials'
      })
      await addClientSecret(slug, 'journey-a')

      await expect(await federateCdpService(slug, REMOVED)).toBe('ready')
      await expect(await federateCdpService(slug, KEPT)).toBe('ready')

      await AdminTeamPage.open(slug)
      teamId = await AdminTeamPage.teamIdFromAuditLink()
    })

    // Later specs sign in again, which sets the role; leave it as it was found
    // in case a test stopped while the person was without it.
    after(() => setMockUserPlatformAdmin(true))

    describe('removing a federated application', () => {
      it('lists each application as ready, with Remove beside it', async () => {
        await openDeployment()

        await expect(
          AdminDeploymentPage.federationRows
        ).toBeElementsArrayOfSize(2)

        for (const name of [REMOVED, KEPT]) {
          await expect(AdminDeploymentPage.federationStatus(name)).toHaveText(
            READY
          )
          await expect(
            AdminDeploymentPage.removeFederationLink(name)
          ).toBeDisplayed()
        }
      })

      it('says what removing does and does not do, and refuses an empty reason', async () => {
        await AdminDeploymentPage.removeFederationLink(REMOVED).click()

        await expect(AdminReasonPage.pageHeading).toHaveText(
          `Remove the application ${REMOVED}`
        )

        for (const sentence of [
          'Removing cannot be undone.',
          'A token already issued to it keeps working until it expires, up to 2 hours.',
          'To stop calls now, also use Disable credentials on this deployment.',
          'The team’s other applications and its secrets are not changed.',
          'The team is not told why.'
        ]) {
          await expect(AdminReasonPage.effect).toHaveText(
            expect.stringContaining(sentence)
          )
        }

        await AdminReasonPage.submitWith('')

        await expect(AdminReasonPage.errorSummary).toHaveText(
          expect.stringContaining('Enter a reason')
        )
        await expect(browser).toHaveTitle(expect.stringContaining('Error:'))

        // Nothing was removed by the refusal.
        await openDeployment()
        await expect(AdminDeploymentPage.federationStatus(REMOVED)).toHaveText(
          READY
        )
      })

      it('refuses an application that is not on the page', async () => {
        const href =
          await AdminDeploymentPage.removeFederationLink(KEPT).getAttribute(
            'href'
          )

        await browser.url(
          href.replace(
            /federations\/[^/]+\/remove$/,
            'federations/not-an-application/remove'
          )
        )

        await expect(AdminDeploymentPage.notification).toHaveText(
          expect.stringContaining(
            'That application is not available to remove.'
          )
        )
        await expect(
          AdminDeploymentPage.federationRows
        ).toBeElementsArrayOfSize(2)
      })

      it('removes the application with a reason, says so and follows the change until it is gone', async () => {
        await AdminDeploymentPage.removeFederationLink(REMOVED).click()
        await AdminReasonPage.submitWith(REMOVE_REASON)

        await expect(AdminDeploymentPage.pageHeading).toHaveText(team.name)
        await expect(AdminDeploymentPage.notification).toHaveText(
          expect.stringContaining(
            `Removal requested for ${REMOVED}. The table shows where it is.`
          )
        )

        await browser.waitUntil(
          async () => {
            if (
              !(await AdminDeploymentPage.federationRow(REMOVED).isExisting())
            ) {
              return true
            }

            await browser.refresh()

            return false
          },
          {
            interval: POLL_MS,
            timeout: journeyData.deployTimeoutMs,
            timeoutMsg: `Expected ${REMOVED} to be removed`
          }
        )
      })

      it('leaves the team’s other application, and shows the team only that one', async () => {
        await expect(AdminDeploymentPage.federationStatus(KEPT)).toHaveText(
          READY
        )
        await expect(
          AdminDeploymentPage.federationRows
        ).toBeElementsArrayOfSize(1)

        await EnvironmentPage.open(slug, ENVIRONMENT)

        await expect(EnvironmentPage.applicationRows).toBeElementsArrayOfSize(1)
        await expect(EnvironmentPage.applicationRow(KEPT)).toHaveText(
          expect.stringContaining(READY)
        )
        await expect(EnvironmentPage.applicationRow(REMOVED)).not.toBeExisting()
      })

      it('records the removal with who did it, the reason, the environment and the outcome', async () => {
        await AdminAuditPage.open(`?team=${teamId}&actorType=platform-admin`)
        const event = (await AdminAuditPage.events()).find(({ action }) =>
          action.startsWith('Removed a team’s federated application')
        )

        await expect(event).toEqual(
          expect.objectContaining({
            team: team.name,
            environment: ENVIRONMENT_LABEL,
            outcome: 'Done'
          })
        )
        await expect(event.who).toContain('Dev User')
        await expect(event.who).toContain('Platform Admin')
        await expect(event.action).toContain(`Reason: ${REMOVE_REASON}`)
      })
    })

    describe('a person in a team whose credentials are disabled', () => {
      before(async () => {
        await openDeployment()
        await AdminDeploymentPage.disableCredentialsButton.click()
        await AdminChooseEnvironmentsPage.submitButton.click()
        await AdminReasonPage.submitWith(DISABLE_REASON)

        await expect(AdminActionDonePage.panelTitle).toHaveText(
          'Credentials disabled'
        )

        // The same person, without the Platform Admin role: the backend reads
        // it on every request, so this is a team Admin and nothing more.
        await removePlatformAdminRole()
      })

      it('sees a banner that says what they cannot do, and not why or by whom', async () => {
        await EnvironmentPage.open(slug, ENVIRONMENT)

        await expect(EnvironmentPage.credentialsBannerHeading).toHaveText(
          CREDENTIALS_HEADING
        )
        await expect(EnvironmentPage.credentialsBanner).toHaveText(
          expect.stringContaining(CREDENTIALS_MESSAGE)
        )
        await expect(EnvironmentPage.tag).toHaveText('Available')
        await expect(TeamLockBanner.root).not.toBeExisting()

        const text = await browser.$('main').getText()

        await expect(text).not.toContain(DISABLE_REASON)
        await expect(text).not.toContain('Platform Admin')
      })

      it('sees add a client secret, view and rotate secret, Federate and Change greyed out', async () => {
        await expect(EnvironmentPage.addClientSecretButton).toHaveAttribute(
          'aria-disabled',
          'true'
        )
        await expect(
          EnvironmentPage.clientSecretAction('view')
        ).not.toBeExisting()
        await expect(
          EnvironmentPage.clientSecretActionLocked('view')
        ).toHaveText(expect.stringContaining('View'))
        await expect(
          EnvironmentPage.clientSecretAction('rotate')
        ).not.toBeExisting()
        await expect(
          EnvironmentPage.clientSecretActionLocked('rotate')
        ).toHaveText(expect.stringContaining('Rotate'))
        await expect(EnvironmentPage.federateButton).toHaveAttribute(
          'aria-disabled',
          'true'
        )
        await expect(
          EnvironmentPage.applicationAction('change')
        ).not.toBeExisting()
        await expect(
          EnvironmentPage.applicationActionLocked('change')
        ).toHaveText(expect.stringContaining('Change'))
      })

      it('can still revoke a client secret and remove an application, and change models and limits', async () => {
        await expect(
          EnvironmentPage.clientSecretAction('revoke')
        ).toBeDisplayed()
        await expect(
          EnvironmentPage.applicationAction('remove')
        ).toBeDisplayed()
        await expect(EnvironmentPage.deployButton).not.toHaveAttribute(
          'aria-disabled',
          'true'
        )
        await expect(EnvironmentPage.changeLimitsLink).toBeDisplayed()
      })

      it('is refused the Federate journey at the answers, with the environment named, and nothing is made', async () => {
        await answerFederateQuestions(slug, REFUSED)

        await expect(FederatePage.errorSummary).toHaveText(
          expect.stringContaining(FEDERATE_REFUSED)
        )
        await expect(browser).toHaveTitle(expect.stringContaining('Error:'))

        await EnvironmentPage.open(slug, ENVIRONMENT)

        await expect(EnvironmentPage.applicationRows).toBeElementsArrayOfSize(1)
        await expect(EnvironmentPage.applicationRow(REFUSED)).not.toBeExisting()
      })

      it('is told the credentials are disabled when they open Change by its address, and nothing changes', async () => {
        const href =
          await EnvironmentPage.applicationAction('remove').getAttribute('href')

        await browser.url(href.replace(/\/remove$/, '/change'))

        await expect(ErrorPage.pageHeading).toHaveText(CREDENTIALS_HEADING)
        await expect(ErrorPage.plainMessage).toHaveText(CREDENTIALS_MESSAGE)
        await expect(browser).toHaveTitle(
          expect.stringContaining(CREDENTIALS_HEADING)
        )

        await EnvironmentPage.open(slug, ENVIRONMENT)
        await expect(EnvironmentPage.applicationRow(KEPT)).toHaveText(
          expect.stringContaining(READY)
        )
      })
    })
  }
)
