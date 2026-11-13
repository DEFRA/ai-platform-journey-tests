import { browser, expect } from '@wdio/globals'

import SignInPage from '#page-objects/sign-in.page'
import NewTeamPage from '#page-objects/teams/new-team.page'
import TeamsPage from '#page-objects/environments/teams.page'
import OverviewPage from '#page-objects/environments/overview.page'
import EnvironmentPage from '#page-objects/environments/environment.page'
import DeployModelPage from '#page-objects/environments/deploy-model.page'
import RequestProgressPage from '#page-objects/environments/request-progress.page'
import LimitsPage from '#page-objects/environments/limits.page'
import ServiceNavigation from '#components/service-navigation.component'

const ENVIRONMENT = process.env.JOURNEY_TEST_ENVIRONMENT || 'infradev'
const MODEL_SLUG = process.env.JOURNEY_TEST_TEAM_MODEL_SLUG || 'gpt-4o'
const MODEL_NAME = process.env.JOURNEY_TEST_TEAM_MODEL_NAME || 'GPT-4o'

// A deploy runs through several stages, a few seconds each under the mock.
const CHANGE_TIMEOUT = 120000

// The failure markers in a purpose only mean something to the mock orchestrator
// the local stack runs with (the same stack that signs in with the mock provider).
const MOCK_STACK = process.env.JOURNEY_TEST_SIGN_IN === 'mock'
const itOnMockStack = MOCK_STACK ? it : it.skip

// Names must be unique and a team's ID cannot change, so each run makes its own.
const stamp = Date.now().toString(36)
const readyTeam = { name: `Journey ${stamp} ready`, serviceCode: 'JTA' }
const failingTeam = { name: `Journey ${stamp} failing`, serviceCode: 'JTB' }

async function createTeam({ name, serviceCode }) {
  await NewTeamPage.create({
    name,
    serviceCode,
    description: 'Created by the journey tests'
  })
}

async function teamSlugFromAddress() {
  const [, slug] = new URL(await browser.getUrl()).pathname.match(
    /^\/environments\/([^/]+)/
  )

  return slug
}

// From the chosen environment's page: the overview's own "Deploy a model" link
// names no environment, so the portal would pick its first one.
async function deployModel(teamSlug, purpose) {
  await OverviewPage.open(teamSlug)
  await OverviewPage.cardLink(ENVIRONMENT).click()
  await EnvironmentPage.deployButton.click()

  await DeployModelPage.chooseModel(MODEL_SLUG)
  await DeployModelPage.describe(purpose)
  await DeployModelPage.requestAccess()
}

describe('Post-signin: environments and deployments', function () {
  // A test may wait up to CHANGE_TIMEOUT for a change, longer than the shared
  // 60 s Mocha timeout; set here, never lowering a longer one (debug runs).
  this.timeout(Math.max(this.timeout(), CHANGE_TIMEOUT + 60000))

  let readySlug
  let failingSlug

  before(async () => {
    await SignInPage.signIn()
    await createTeam(readyTeam)
    await createTeam(failingTeam)
  })

  it('shows the Environments section in the navigation', async () => {
    await expect(await ServiceNavigation.linkTexts()).toEqual([
      'Model catalogue',
      'Personal access',
      'Teams',
      'Environments',
      'Help'
    ])
  })

  it('lets the person choose one of their teams', async () => {
    await ServiceNavigation.link('Environments').click()

    await expect(browser).toHaveUrl(expect.stringContaining('/environments'))
    await expect(TeamsPage.teamLink(failingTeam.name)).toBeDisplayed()

    await TeamsPage.chooseTeam(readyTeam.name)

    readySlug = await teamSlugFromAddress()
    await expect(browser).toHaveUrl(
      expect.stringContaining(`/environments/${readySlug}`)
    )
    await expect(OverviewPage.pageHeading).toHaveText(
      'Environments and deployments'
    )
  })

  it('shows the overview of the team with the environment and no changes', async () => {
    await expect(OverviewPage.card(ENVIRONMENT)).toBeDisplayed()
    await expect(OverviewPage.cardLink(ENVIRONMENT)).toBeDisplayed()
    await expect(OverviewPage.deployButton).toBeDisplayed()
    await expect(OverviewPage.noChangesInProgress).toBeDisplayed()
  })

  it('opens an environment page that has no models yet', async () => {
    await OverviewPage.cardLink(ENVIRONMENT).click()

    await expect(browser).toHaveUrl(
      expect.stringContaining(`/environments/${readySlug}/${ENVIRONMENT}`)
    )
    await expect(EnvironmentPage.status).toBeDisplayed()
    await expect(EnvironmentPage.noChangesInProgress).toBeDisplayed()
    await expect(EnvironmentPage.modelRows).toBeElementsArrayOfSize(0)
  })

  it('deploys a model and follows its progress to ready', async () => {
    await EnvironmentPage.deployButton.click()

    await DeployModelPage.chooseModel(MODEL_SLUG)
    await expect(DeployModelPage.environmentInset).toBeDisplayed()
    await DeployModelPage.describe('Journey test automated run')
    await DeployModelPage.requestAccess()

    await expect(RequestProgressPage.status).toBeDisplayed()
    await expect(RequestProgressPage.stepItems).toBeElementsArrayOfSize({
      gte: 1
    })

    await RequestProgressPage.finished.waitForDisplayed({
      timeout: CHANGE_TIMEOUT,
      timeoutMsg: 'Expected the request to finish'
    })

    await RequestProgressPage.checkProgressLink.click()
    await expect(RequestProgressPage.readyPanel).toBeDisplayed()
  })

  it('shows the deployed model on the environment page', async () => {
    await EnvironmentPage.open(readySlug, ENVIRONMENT)

    await expect(EnvironmentPage.modelRow(MODEL_NAME)).toBeDisplayed()
    await expect(EnvironmentPage.noChangesInProgress).toBeDisplayed()
    await expect(EnvironmentPage.recentChanges).toBeElementsArrayOfSize({
      gte: 1
    })
  })

  itOnMockStack(
    'shows a failed change with its reason when the checks fail',
    async () => {
      await TeamsPage.open()
      await TeamsPage.chooseTeam(failingTeam.name)
      failingSlug = await teamSlugFromAddress()

      await deployModel(failingSlug, 'Journey test [mock:checks-failed]')

      await RequestProgressPage.finished.waitForDisplayed({
        timeout: CHANGE_TIMEOUT,
        timeoutMsg: 'Expected the failed request to finish'
      })

      await RequestProgressPage.checkProgressLink.click()
      await expect(RequestProgressPage.failureReason).toBeDisplayed()

      await EnvironmentPage.open(failingSlug, ENVIRONMENT)

      await expect(EnvironmentPage.noChangesInProgress).toBeDisplayed()
      await expect(EnvironmentPage.recentChange('Failed')).toBeDisplayed()
      await expect(EnvironmentPage.failure).toHaveText(
        expect.stringContaining('checks failed')
      )
      await expect(EnvironmentPage.failure).toHaveText(
        expect.stringContaining('Quote')
      )
    }
  )

  it('refuses limits outside the bounds and keeps what was there', async () => {
    await EnvironmentPage.open(readySlug, ENVIRONMENT)
    const tokensBefore = await EnvironmentPage.limitsTokens.getText()

    await EnvironmentPage.changeLimitsLink.click()
    await LimitsPage.answer({ tokensPerMinute: 0, requestsPerMinute: 0 })

    await expect(LimitsPage.errorSummary).toBeDisplayed()
    await expect(browser).toHaveTitle(expect.stringContaining('Error:'))

    await EnvironmentPage.open(readySlug, ENVIRONMENT)
    await expect(EnvironmentPage.limitsTokens).toHaveText(tokensBefore)
    await expect(EnvironmentPage.noChangesInProgress).toBeDisplayed()
  })

  it('changes the limits and shows them once the change is done', async () => {
    await EnvironmentPage.open(readySlug, ENVIRONMENT)
    await EnvironmentPage.changeLimitsLink.click()

    await LimitsPage.answer({ tokensPerMinute: 1500, requestsPerMinute: 50 })
    await expect(LimitsPage.checkRows).toBeDisplayed()
    await LimitsPage.confirm()

    await expect(browser).toHaveUrl(
      expect.stringContaining(`/environments/${readySlug}/${ENVIRONMENT}`)
    )
    await expect(EnvironmentPage.liveRegion).toBeDisplayed()
    await expect(EnvironmentPage.changesInProgress).toBeElementsArrayOfSize({
      gte: 1
    })

    await browser.waitUntil(
      async () => {
        await browser.refresh()

        return EnvironmentPage.noChangesInProgress.isDisplayed()
      },
      {
        timeout: CHANGE_TIMEOUT,
        interval: 3000,
        timeoutMsg: 'Expected the limits change to finish'
      }
    )

    await expect(EnvironmentPage.limitsTokens).toHaveText('1,500')
    await expect(EnvironmentPage.limitsRequests).toHaveText('50')
    await expect(EnvironmentPage.recentChange('Change limits')).toBeDisplayed()
  })
})
