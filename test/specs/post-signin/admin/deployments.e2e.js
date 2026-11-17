import { browser, expect } from '@wdio/globals'

import AdminTabs from '#components/admin-tabs.component'
import AdminDeploymentPage from '#page-objects/admin/deployment.page'
import AdminDeploymentsPage from '#page-objects/admin/deployments.page'
import AdminTeamPage from '#page-objects/admin/team.page'
import AdminTeamsPage from '#page-objects/admin/teams.page'
import { signInAs } from '#support/admin-session'
import {
  addClientSecret,
  deployModel,
  ENVIRONMENT_LABEL
} from '#support/deployments'
import { FORCED_FAILURE_MARKERS } from '#support/journey-data'
import { isMockStack } from '#support/mock-stack'
import { createTeam } from '#support/teams'

const describeOnMockStack = isMockStack() ? describe : describe.skip

// Three teams, each with its own model, so the list has a ready deployment, one
// whose deploy failed (a Retry can be made) and one whose checks failed (it
// cannot be retried: the team must ask again).
const READY = { modelSlug: 'gpt-4o', modelName: 'GPT-4o' }
const DEPLOY_FAILED = { modelSlug: 'gpt-5-nano', modelName: 'GPT-5 nano' }
const CHECKS_FAILED = { modelSlug: 'gpt-4o', modelName: 'GPT-4o' }

const NEEDS_ATTENTION = 'Needs attention'

// The address's query once a GET form has answered.
function waitForQuery(name, value) {
  return browser.waitUntil(
    async () =>
      new URL(await browser.getUrl()).searchParams.get(name) === value,
    { timeoutMsg: `Expected the address to hold ${name}=${value}` }
  )
}

describeOnMockStack('Platform Admin: the Deployments tab', function () {
  // The set up deploys a model for three teams, which the mock orchestrator
  // finishes in about twenty seconds each.
  this.timeout(Math.max(this.timeout(), 600000))

  const stamp = Date.now().toString(36)
  // Team names carry one stamp, so a search for it finds these teams only.
  const named = (purpose, serviceCode) => ({
    name: `Admin journey ${stamp} ${purpose}`,
    serviceCode
  })
  const ready = named('ready', 'JDA')
  const deployFailed = named('deploy failed', 'JDB')
  const checksFailed = named('checks failed', 'JDC')

  before(async () => {
    await signInAs('admin')

    const readySlug = await createTeam(ready)
    await deployModel(readySlug, {
      modelSlug: READY.modelSlug,
      purpose: 'Journey test: a deployment that becomes ready'
    })
    await addClientSecret(readySlug, 'journey-a')

    await deployModel(await createTeam(deployFailed), {
      modelSlug: DEPLOY_FAILED.modelSlug,
      purpose: `Journey test ${FORCED_FAILURE_MARKERS.deployFailed}`
    })

    await deployModel(await createTeam(checksFailed), {
      modelSlug: CHECKS_FAILED.modelSlug,
      purpose: `Journey test ${FORCED_FAILURE_MARKERS.checksFailed}`
    })
  })

  describe('the list', () => {
    it('is a tab of the Admin area and shows each environment as a tab', async () => {
      await AdminTeamsPage.open()
      await AdminTabs.tab('Deployments').click()

      await expect(browser).toHaveUrl(
        expect.stringContaining('/admin/deployments')
      )
      await expect(AdminDeploymentsPage.pageHeading).toHaveText('Deployments')
      await expect(AdminTabs.currentTab).toHaveText('Deployments')
      await expect(AdminDeploymentsPage.currentEnvironmentTab).toHaveText(
        ENVIRONMENT_LABEL
      )
    })

    it('shows each team’s deployment with its models, status and credential', async () => {
      await AdminDeploymentsPage.open(`?search=${stamp}`)

      await expect(AdminDeploymentsPage.count).toHaveText(
        `Showing 1 to 3 of 3 deployments in ${ENVIRONMENT_LABEL}`
      )
      await expect((await AdminDeploymentsPage.teamNames()).sort()).toEqual(
        [ready.name, deployFailed.name, checksFailed.name].sort()
      )

      for (const [team, model, status, credential] of [
        [ready, READY.modelName, 'Ready', 'Active'],
        [deployFailed, DEPLOY_FAILED.modelName, NEEDS_ATTENTION, 'None'],
        [checksFailed, CHECKS_FAILED.modelName, NEEDS_ATTENTION, 'None']
      ]) {
        await expect(AdminDeploymentsPage.cell(team.name, 'Models')).toHaveText(
          model
        )
        await expect(AdminDeploymentsPage.cell(team.name, 'Status')).toHaveText(
          status
        )
        await expect(
          AdminDeploymentsPage.cell(team.name, 'Credential')
        ).toHaveText(credential)
      }
    })

    it('narrows the list by status and keeps the choice on the page', async () => {
      await AdminDeploymentsPage.open()
      await AdminDeploymentsPage.filterBy({ search: stamp, status: 'Ready' })
      await waitForQuery('status', 'ready')

      await expect(await AdminDeploymentsPage.teamNames()).toEqual([ready.name])
      await expect(AdminDeploymentsPage.statusSelect).toHaveValue('ready')
      await expect(AdminDeploymentsPage.searchField).toHaveValue(stamp)

      await AdminDeploymentsPage.filterBy({ status: NEEDS_ATTENTION })
      await waitForQuery('status', 'needs-attention')

      await expect((await AdminDeploymentsPage.teamNames()).sort()).toEqual(
        [deployFailed.name, checksFailed.name].sort()
      )
    })

    it('narrows the list by model', async () => {
      await AdminDeploymentsPage.open(`?search=${stamp}`)
      await AdminDeploymentsPage.filterBy({ model: DEPLOY_FAILED.modelName })
      await waitForQuery('model', DEPLOY_FAILED.modelSlug)

      await expect(await AdminDeploymentsPage.teamNames()).toEqual([
        deployFailed.name
      ])
    })

    it('narrows the list by credential', async () => {
      await AdminDeploymentsPage.open(`?search=${stamp}`)
      await AdminDeploymentsPage.filterBy({ credential: 'Active' })
      await waitForQuery('credential', 'active')

      await expect(await AdminDeploymentsPage.teamNames()).toEqual([ready.name])

      await AdminDeploymentsPage.filterBy({ credential: 'None' })
      await waitForQuery('credential', 'none')

      await expect((await AdminDeploymentsPage.teamNames()).sort()).toEqual(
        [deployFailed.name, checksFailed.name].sort()
      )
    })

    it('combines the filters', async () => {
      await AdminDeploymentsPage.open(`?search=${stamp}`)
      await AdminDeploymentsPage.filterBy({
        model: CHECKS_FAILED.modelName,
        status: NEEDS_ATTENTION,
        credential: 'None'
      })
      await waitForQuery('credential', 'none')

      await expect(await AdminDeploymentsPage.teamNames()).toEqual([
        checksFailed.name
      ])
    })

    it('says so when nothing matches and clears the filters', async () => {
      await AdminDeploymentsPage.open()
      await AdminDeploymentsPage.filterBy({ search: `${stamp} no such team` })
      await waitForQuery('search', `${stamp} no such team`)

      await expect(AdminDeploymentsPage.empty).toHaveText(
        expect.stringContaining('No deployments match')
      )
      await expect(AdminDeploymentsPage.rows).toBeElementsArrayOfSize(0)

      await AdminDeploymentsPage.clearFiltersLink.click()

      await expect(browser).not.toHaveUrl(expect.stringContaining('search='))
      await expect(AdminDeploymentsPage.searchField).toHaveValue('')
      await expect(AdminDeploymentsPage.rows).toBeElementsArrayOfSize({
        gte: 3
      })
    })

    it('refuses a search under two characters and keeps what was typed', async () => {
      await AdminDeploymentsPage.open('?search=a')

      await expect(AdminDeploymentsPage.errorSummary).toHaveText(
        expect.stringContaining('Search must be 2 to 100 characters')
      )
      await expect(browser).toHaveTitle(expect.stringContaining('Error:'))
      await expect(AdminDeploymentsPage.searchField).toHaveValue('a')
      await expect(AdminDeploymentsPage.rows).toBeElementsArrayOfSize(0)
    })
  })

  describe('a deployment', () => {
    before(async () => {
      await AdminDeploymentsPage.open(`?search=${stamp}`)
      await AdminDeploymentsPage.teamLink(ready.name).click()
    })

    it('shows the credential, the members and the health of each model', async () => {
      await expect(AdminDeploymentPage.pageHeading).toHaveText(ready.name)
      await expect(AdminDeploymentPage.status).toHaveText('Ready')
      await expect(AdminDeploymentPage.summaryValue('Credential')).toHaveText(
        'Active'
      )
      await expect(AdminDeploymentPage.summaryValue('Members')).toHaveText(
        expect.stringContaining('1 member')
      )
      await expect(AdminDeploymentPage.summaryValue('Team status')).toHaveText(
        'Active'
      )

      await expect(AdminDeploymentPage.modelRows).toBeElementsArrayOfSize(1)
      await expect(AdminDeploymentPage.modelRow(READY.modelName)).toHaveText(
        expect.stringContaining('Ready to use')
      )
    })

    it('lists the client secrets of the team with whether each can be revoked', async () => {
      // The one made when the environment was set up never expires; the other
      // was added by the team's Admin.
      const secrets = await AdminDeploymentPage.secrets()

      await expect(secrets).toHaveLength(2)
      await expect(secrets.map(({ status }) => status)).toEqual([
        'Active',
        'Active'
      ])
      await expect(secrets.map(({ canRevoke }) => canRevoke)).toEqual([
        true,
        true
      ])
      await expect(
        secrets.filter(({ expires }) => expires === 'Never')
      ).toHaveLength(1)
    })

    it('asks for a reconcile and says it was asked for', async () => {
      await AdminDeploymentPage.modelButton(
        READY.modelName,
        'Reconcile'
      ).click()

      await expect(AdminDeploymentPage.notification).toHaveText(
        expect.stringContaining(
          `Reconcile requested for ${READY.modelName}. The table shows where it is.`
        )
      )
      await expect(AdminDeploymentPage.pageHeading).toHaveText(ready.name)
      await expect(AdminDeploymentPage.modelRows).toBeElementsArrayOfSize(1)
    })

    it('opens the team from the deployment', async () => {
      await AdminDeploymentPage.viewTeamLink.click()

      await expect(browser).toHaveUrl(
        expect.stringMatching(/\/admin\/teams\/[0-9a-f]{24}$/)
      )
      await expect(AdminTeamPage.pageHeading).toHaveText(ready.name)
    })
  })

  describe('a deployment that failed', () => {
    it('offers Retry where the deploy failed, and asks for it', async () => {
      await AdminDeploymentsPage.open(`?search=${stamp}`)
      await AdminDeploymentsPage.teamLink(deployFailed.name).click()

      await expect(AdminDeploymentPage.status).toHaveText(NEEDS_ATTENTION)
      await expect(AdminDeploymentPage.summaryValue('Credential')).toHaveText(
        'None'
      )
      await expect(
        AdminDeploymentPage.modelButton(DEPLOY_FAILED.modelName, 'Retry')
      ).toBeDisplayed()

      await AdminDeploymentPage.modelButton(
        DEPLOY_FAILED.modelName,
        'Retry'
      ).click()

      await expect(AdminDeploymentPage.notification).toHaveText(
        expect.stringContaining(
          `Retry requested for ${DEPLOY_FAILED.modelName}. The table shows where it is.`
        )
      )
    })

    it('offers no Retry where the checks failed, and says the team must ask again', async () => {
      await AdminDeploymentsPage.open(`?search=${stamp}`)
      await AdminDeploymentsPage.teamLink(checksFailed.name).click()

      await expect(AdminDeploymentPage.status).toHaveText(NEEDS_ATTENTION)
      await expect(
        AdminDeploymentPage.modelButton(CHECKS_FAILED.modelName, 'Retry')
      ).not.toBeExisting()
      await expect(
        AdminDeploymentPage.modelButton(CHECKS_FAILED.modelName, 'Reconcile')
      ).toBeDisplayed()
      await expect(
        AdminDeploymentPage.modelRow(CHECKS_FAILED.modelName)
      ).toHaveText(
        expect.stringContaining('The team must request this model again.')
      )
    })
  })
})
