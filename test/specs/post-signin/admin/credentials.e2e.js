import { browser, expect } from '@wdio/globals'

import AdminActionDonePage from '#page-objects/admin/action-done.page'
import AdminAuditPage from '#page-objects/admin/audit.page'
import AdminChooseEnvironmentsPage from '#page-objects/admin/choose-environments.page'
import AdminDeploymentPage from '#page-objects/admin/deployment.page'
import AdminDeploymentsPage from '#page-objects/admin/deployments.page'
import AdminReasonPage from '#page-objects/admin/reason.page'
import AdminTeamPage from '#page-objects/admin/team.page'
import EnvironmentPage from '#page-objects/environments/environment.page'
import { signInAs } from '#support/admin-session'
import { readEach } from '#support/element-values'
import {
  addClientSecret,
  deployModel,
  ENVIRONMENT,
  ENVIRONMENT_LABEL
} from '#support/deployments'
import { isMockStack } from '#support/mock-stack'
import { createTeam, newTeamNamed } from '#support/teams'

const describeOnMockStack = isMockStack() ? describe : describe.skip

const MODEL = { slug: 'gpt-4o', name: 'GPT-4o' }
const DISABLE_REASON = 'Journey test: the credentials are being misused'
const REVOKE_REASON = 'Journey test: this secret was shared in a chat'
const MOST_REASON_CHARACTERS = 500

describeOnMockStack(
  'Platform Admin: disabling and enabling credentials and revoking a client secret',
  function () {
    // The set up deploys a model, which the mock orchestrator finishes in
    // about twenty seconds, and adds a client secret.
    this.timeout(Math.max(this.timeout(), 300000))

    const team = newTeamNamed('credentials', 'JCR')
    const stamp = team.name.split(' ')[2]
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
        modelSlug: MODEL.slug,
        purpose: 'Journey test: a deployment to hold credentials'
      })
      await addClientSecret(slug, 'journey-a')

      await AdminTeamPage.open(slug)
      teamId = await AdminTeamPage.teamIdFromAuditLink()
    })

    describe('disabling credentials', () => {
      it('offers Disable credentials, and not Enable, while they are active', async () => {
        await openDeployment()

        await expect(AdminDeploymentPage.summaryValue('Credential')).toHaveText(
          'Active'
        )
        await expect(
          AdminDeploymentPage.disableCredentialsButton
        ).toBeDisplayed()
        await expect(
          AdminDeploymentPage.enableCredentialsButton
        ).not.toBeExisting()
      })

      it('asks which environments, with the current one ticked, and needs at least one', async () => {
        await AdminDeploymentPage.disableCredentialsButton.click()

        await expect(AdminChooseEnvironmentsPage.legend).toHaveText(
          'Which environments?'
        )
        await expect(await AdminChooseEnvironmentsPage.tickedLabels()).toEqual([
          ENVIRONMENT_LABEL
        ])

        await AdminChooseEnvironmentsPage.choose([])
        await AdminChooseEnvironmentsPage.submitButton.click()

        await expect(AdminChooseEnvironmentsPage.errorSummary).toHaveText(
          expect.stringContaining('Choose at least one environment')
        )
        await expect(browser).toHaveTitle(expect.stringContaining('Error:'))
      })

      it('refuses an empty reason and a reason over 500 characters, and keeps what was typed', async () => {
        await AdminChooseEnvironmentsPage.choose([ENVIRONMENT])
        await AdminChooseEnvironmentsPage.submitButton.click()

        await expect(AdminReasonPage.pageHeading).toHaveText(
          `Disable credentials in ${ENVIRONMENT_LABEL}`
        )
        await expect(AdminReasonPage.effect).toHaveText(
          expect.stringContaining('The team is not told why.')
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

        // Nothing was disabled by either refusal.
        await openDeployment()
        await expect(AdminDeploymentPage.summaryValue('Credential')).toHaveText(
          'Active'
        )
      })

      it('disables the credentials with a reason and confirms where', async () => {
        await AdminDeploymentPage.disableCredentialsButton.click()
        await AdminChooseEnvironmentsPage.submitButton.click()
        await AdminReasonPage.submitWith(DISABLE_REASON)

        await expect(AdminActionDonePage.panelTitle).toHaveText(
          'Credentials disabled'
        )
        await expect(AdminActionDonePage.panel).toHaveText(
          expect.stringContaining(`in ${ENVIRONMENT_LABEL}`)
        )

        await AdminActionDonePage.backLink.click()

        await expect(AdminDeploymentPage.pageHeading).toHaveText(team.name)
      })

      it('shows Disabled on the deployment and in the list, and offers Enable instead', async () => {
        await expect(AdminDeploymentPage.summaryValue('Credential')).toHaveText(
          expect.stringContaining('Disabled')
        )
        await expect(AdminDeploymentPage.summaryValue('Credential')).toHaveText(
          expect.stringContaining('Disabled on')
        )
        await expect(
          AdminDeploymentPage.enableCredentialsButton
        ).toBeDisplayed()
        await expect(
          AdminDeploymentPage.disableCredentialsButton
        ).not.toBeExisting()

        await AdminDeploymentsPage.open(`?search=${stamp}`)

        await expect(
          AdminDeploymentsPage.cell(team.name, 'Credential')
        ).toHaveText('Disabled')

        await AdminDeploymentsPage.filterBy({ credential: 'Disabled' })
        await browser.waitUntil(
          async () =>
            new URL(await browser.getUrl()).searchParams.get('credential') ===
            'disabled'
        )

        await expect(await AdminDeploymentsPage.teamNames()).toEqual([
          team.name
        ])
      })
    })

    describe('enabling credentials', () => {
      it('acts at once on the environment chosen and says so', async () => {
        await openDeployment()
        await AdminDeploymentPage.enableCredentialsButton.click()

        await expect(AdminChooseEnvironmentsPage.legend).toHaveText(
          'Which environments?'
        )
        await expect(await AdminChooseEnvironmentsPage.tickedLabels()).toEqual([
          ENVIRONMENT_LABEL
        ])

        await AdminChooseEnvironmentsPage.submitButton.click()

        await expect(AdminDeploymentPage.pageHeading).toHaveText(team.name)
        await expect(AdminDeploymentPage.notification).toHaveText(
          expect.stringContaining(
            `Credentials enabled in ${ENVIRONMENT_LABEL}.`
          )
        )
        await expect(AdminDeploymentPage.summaryValue('Credential')).toHaveText(
          'Active'
        )
        await expect(
          AdminDeploymentPage.disableCredentialsButton
        ).toBeDisplayed()
      })

      it('shows Active in the list again', async () => {
        await AdminDeploymentsPage.open(`?search=${stamp}`)

        await expect(
          AdminDeploymentsPage.cell(team.name, 'Credential')
        ).toHaveText('Active')
      })
    })

    describe('revoking one client secret', () => {
      let revoked
      let kept

      it('revokes the secret the team’s Admin added, with a reason, and takes it off the list', async () => {
        await openDeployment()

        // The secret made when the environment was set up never expires; the
        // one the team's Admin added does.
        const secrets = await AdminDeploymentPage.secrets()

        await expect(secrets).toHaveLength(2)
        revoked = secrets.find(({ expires }) => expires !== 'Never').hint
        kept = secrets.find(({ expires }) => expires === 'Never').hint

        await AdminDeploymentPage.revokeLink(revoked).click()

        await expect(AdminReasonPage.pageHeading).toHaveText(
          `Revoke the secret ending ${revoked}`
        )
        await expect(AdminReasonPage.effect).toHaveText(
          expect.stringContaining('The team’s other secrets are not changed.')
        )
        // What revoking does not do: a token already issued keeps working.
        await expect(AdminReasonPage.effect).toHaveText(
          expect.stringContaining(
            'A token already issued with it keeps working until it expires, up to 2 hours.'
          )
        )
        // Disable credentials has no gateway effect until S2, so the page does
        // not offer it as a way to stop calls.
        await expect(AdminReasonPage.effect).not.toHaveText(
          expect.stringContaining('Disable credentials')
        )

        await AdminReasonPage.submitWith('')

        await expect(AdminReasonPage.errorSummary).toHaveText(
          expect.stringContaining('Enter a reason')
        )

        await AdminReasonPage.submitWith(REVOKE_REASON)

        await expect(AdminDeploymentPage.pageHeading).toHaveText(team.name)
        await expect(AdminDeploymentPage.notification).toHaveText(
          expect.stringContaining(`Revoked the secret ending ${revoked}.`)
        )
        // A revoked secret is deleted, so the page no longer lists it: the
        // backend lists active and expired secrets only.
        await expect(
          (await AdminDeploymentPage.secrets()).map(({ hint }) => hint)
        ).not.toContain(revoked)
        await expect(AdminDeploymentPage.secretRow(revoked)).not.toBeExisting()
      })

      it('leaves the team’s other secret active and revocable', async () => {
        await expect(await AdminDeploymentPage.secrets()).toEqual([
          expect.objectContaining({
            hint: kept,
            status: 'Active',
            canRevoke: true
          })
        ])
      })

      it('shows the team the secret that stays and none that was revoked', async () => {
        await EnvironmentPage.open(slug, ENVIRONMENT)

        const rows = (
          await readEach(await EnvironmentPage.clientSecretRows, (row) =>
            row.getText()
          )
        ).map((text) => text.toLowerCase())

        await expect(
          rows.some(
            (text) => text.includes(`ends ${kept}`) && text.includes('active')
          )
        ).toBe(true)
        await expect(
          rows.some((text) => text.includes(`ends ${revoked}`))
        ).toBe(false)
      })

      it('asks for a reason before revoking and refuses a secret that is not listed', async () => {
        await openDeployment()
        const href =
          await AdminDeploymentPage.revokeLink(kept).getAttribute('href')
        await browser.url(
          href.replace(/[0-9a-f]{24}\/revoke$/, `${'0'.repeat(24)}/revoke`)
        )

        await expect(AdminDeploymentPage.notification).toHaveText(
          expect.stringContaining('That secret is not available to revoke.')
        )
        await expect(await AdminDeploymentPage.secrets()).toHaveLength(1)
      })
    })

    describe('the audit log', () => {
      it('records each of the three actions with who did it, the reason and the outcome', async () => {
        await AdminAuditPage.open(`?team=${teamId}`)
        const events = await AdminAuditPage.events()

        for (const [label, reason] of [
          ['Disabled a team’s credentials', DISABLE_REASON],
          ['Enabled a team’s credentials', undefined],
          ['Revoked a team’s secret', REVOKE_REASON]
        ]) {
          const event = events.find((candidate) =>
            candidate.action.startsWith(label)
          )

          await expect(event).toEqual(
            expect.objectContaining({ team: team.name, outcome: 'Done' })
          )
          await expect(event.who).toContain('Dev User')
          await expect(event.who).toContain('Platform Admin')

          if (reason) {
            await expect(event.action).toContain(`Reason: ${reason}`)
          }
        }
      })

      it('records the three actions and nothing for the refused reasons', async () => {
        await AdminAuditPage.open(`?team=${teamId}&actorType=platform-admin`)
        const labels = (await AdminAuditPage.events())
          .map(({ action }) => action.split('\n')[0])
          .filter(
            (action) =>
              action.includes('credentials') || action.includes('secret')
          )

        await expect(labels.sort()).toEqual([
          'Disabled a team’s credentials',
          'Enabled a team’s credentials',
          'Revoked a team’s secret'
        ])
      })

      it('names the environment on each of them, so the Environment filter finds them', async () => {
        await AdminAuditPage.open(
          `?team=${teamId}&environment=${ENVIRONMENT}&actorType=platform-admin`
        )
        const events = await AdminAuditPage.events()

        await expect(
          events
            .map(({ action }) => action.split('\n')[0])
            .filter(
              (action) =>
                action.includes('credentials') || action.includes('secret')
            )
            .sort()
        ).toEqual([
          'Disabled a team’s credentials',
          'Enabled a team’s credentials',
          'Revoked a team’s secret'
        ])
        await expect(events.map(({ environment }) => environment)).toEqual(
          events.map(() => ENVIRONMENT_LABEL)
        )
      })
    })
  }
)
