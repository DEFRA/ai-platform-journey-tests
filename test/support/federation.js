import { browser } from '@wdio/globals'

import FederatePage from '#page-objects/environments/federate.page'
import { journeyData } from './journey-data.js'
import { ENVIRONMENT } from './deployments.js'

const POLL_MS = 3000

async function hasFinished() {
  if (await FederatePage.readyPanel.isExisting()) {
    return true
  }

  return (
    (await FederatePage.lead.isExisting()) &&
    !(await FederatePage.lead.getText()).includes('usually takes')
  )
}

/**
 * Answers the Federate questions for a CDP service in the team's environment,
 * as the person signed in, from where the environment's button leads: where it
 * runs, which environment, the service. It stops on the page that follows, the
 * answers to check, or the environments question again if one is refused.
 * @param {string} teamSlug
 * @param {string} service - The CDP service name, 32 characters at most.
 */
export async function answerFederateQuestions(teamSlug, service) {
  await FederatePage.open(teamSlug, ENVIRONMENT)

  await FederatePage.hostCdp.click()
  await FederatePage.continueButton.click()

  if (!(await FederatePage.checkbox(ENVIRONMENT).isSelected())) {
    await FederatePage.checkbox(ENVIRONMENT).click()
  }

  await FederatePage.continueButton.click()

  await FederatePage.serviceField.setValue(service)
  await FederatePage.continueButton.click()
}

/**
 * Makes a passwordless credential for a CDP service in the team's environment,
 * as the person signed in (a team Admin), and waits until the change has
 * finished, well or not. The mock orchestrator ends it as the service name says
 * (`mock-deploy-failed` in the name fails it); without a marker it ends ready.
 * @param {string} teamSlug
 * @param {string} service - The CDP service name, 32 characters at most.
 * @returns {Promise<'ready' | 'failed'>} How the change ended.
 */
export async function federateCdpService(teamSlug, service) {
  await answerFederateQuestions(teamSlug, service)

  // The answers to check, then the change itself.
  await FederatePage.continueButton.click()

  // The page refreshes its status itself, but its panel only on a new load.
  await browser.waitUntil(
    async () => {
      if (await hasFinished()) {
        return true
      }

      await browser.refresh()

      return false
    },
    {
      interval: POLL_MS,
      timeout: journeyData.deployTimeoutMs,
      timeoutMsg: `Expected the passwordless credential for ${service} to finish`
    }
  )

  return (await FederatePage.readyPanel.isExisting()) ? 'ready' : 'failed'
}
