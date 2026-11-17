import { expect } from '@wdio/globals'

import ClientSecretAddPage from '#page-objects/environments/client-secret-add.page'
import DeployModelPage from '#page-objects/environments/deploy-model.page'
import EnvironmentPage from '#page-objects/environments/environment.page'
import OverviewPage from '#page-objects/environments/overview.page'
import RequestProgressPage from '#page-objects/environments/request-progress.page'
import { journeyData } from './journey-data.js'

// The environment the Admin journeys set a team up in, and the name the portal
// gives it (the code `infradev` fills the Development slot).
export const ENVIRONMENT = process.env.JOURNEY_TEST_ENVIRONMENT || 'infradev'
export const ENVIRONMENT_LABEL =
  process.env.JOURNEY_TEST_ENVIRONMENT_LABEL || 'Development'

/**
 * Asks, as the person signed in (a team Admin), for a model in the team's
 * environment and waits until the request has finished, whether it ended well
 * or not. The mock orchestrator ends it as the purpose says (a marker such as
 * `[mock:deploy-failed]`); without one it ends ready.
 * @param {string} teamSlug
 * @param {{modelSlug: string, purpose: string}} request
 */
export async function deployModel(teamSlug, { modelSlug, purpose }) {
  await OverviewPage.open(teamSlug)
  await OverviewPage.cardLink(ENVIRONMENT).click()
  await EnvironmentPage.deployButton.click()

  await DeployModelPage.chooseModel(modelSlug)
  await DeployModelPage.describe(purpose)
  await DeployModelPage.requestAccess()

  await RequestProgressPage.finished.waitForDisplayed({
    timeout: journeyData.deployTimeoutMs,
    timeoutMsg: `Expected the request for ${modelSlug} to finish`
  })
}

/**
 * Adds a client secret in the team's environment, as the person signed in (a
 * team Admin). The environment must be set up. The mock issuer makes it, so
 * it is a placeholder that does not work with the gateway.
 * @param {string} teamSlug
 * @param {string} name - A short name to tell the secrets apart.
 */
export async function addClientSecret(teamSlug, name) {
  await EnvironmentPage.open(teamSlug, ENVIRONMENT)
  await EnvironmentPage.addClientSecretButton.click()
  await ClientSecretAddPage.add(name)

  await expect(ClientSecretAddPage.added).toBeDisplayed()
}
