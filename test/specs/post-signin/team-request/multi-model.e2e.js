import { browser, expect } from '@wdio/globals'

import SignInPage from '#page-objects/sign-in.page'
import CheckRequestPage from '#page-objects/team-request/check-request.page'
import RequestPage from '#page-objects/team-request/request.page'
import ReadyPage from '#page-objects/team-request/ready.page'
import TeamModelsPage from '#page-objects/team-request/team-models.page'
import { journeyData, skipUnlessConfigured } from '#support/journey-data'
import { chooseModels, submitRequest } from '#support/team-request-journey'

const READY_TEXT = 'Ready to use'

describe('Post-signin: asking for several models at once (AC1)', () => {
  before(async function () {
    skipUnlessConfigured(this)
    await SignInPage.signIn()
  })

  it('makes one request for three models and has them all ready together', async function () {
    this.timeout(journeyData.deployTimeoutMs + 60000)
    const { teamSlug, multiModelSlugs } = journeyData

    const names = await chooseModels({
      teamSlug,
      modelSlugs: multiModelSlugs,
      purpose: 'Journey test: several models in one request'
    })

    // One summary and one button for every model.
    const summary = await CheckRequestPage.summaryText()
    for (const name of names) {
      expect(summary).toContain(name)
    }
    await expect(CheckRequestPage.requestAccessButton).toBeDisplayed()

    const requestPath = await submitRequest()

    // One request page for the lot, and it names every model.
    expect(requestPath).toMatch(
      new RegExp(`^/connect/team/request/${teamSlug}/[^/]+$`)
    )
    for (const name of names) {
      await expect(RequestPage.pageHeading).toHaveText(
        expect.stringContaining(name)
      )
    }

    // They become ready together: the page that says so names all of them,
    // and the team's Models tab then shows every one ready.
    await RequestPage.waitForOutcome(
      () => ReadyPage.panel,
      journeyData.deployTimeoutMs
    )
    await expect(RequestPage.pageHeading).toHaveText(
      expect.stringContaining('are ready')
    )
    for (const name of names) {
      await expect(RequestPage.pageHeading).toHaveText(
        expect.stringContaining(name)
      )
    }

    await TeamModelsPage.open(teamSlug)
    for (const name of names) {
      await browser.waitUntil(
        async () => (await TeamModelsPage.statusOf(name)) === READY_TEXT,
        {
          timeoutMsg: `Expected ${name} to read "${READY_TEXT}" on the team's page`
        }
      )
    }
  })
})
