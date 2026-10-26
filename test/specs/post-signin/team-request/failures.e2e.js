import { expect } from '@wdio/globals'

import SignInPage from '#page-objects/sign-in.page'
import FailedPage from '#page-objects/team-request/failed.page'
import RequestPage from '#page-objects/team-request/request.page'
import TeamModelsPage from '#page-objects/team-request/team-models.page'
import {
  FORCED_FAILURE_MARKERS,
  journeyData,
  skipUnlessConfigured
} from '#support/journey-data'
import { requestModels } from '#support/team-request-journey'

// Each kind of failure, forced through the mock orchestrator's marker in the
// request's purpose (plan C6 and P6-4), and what the reason should be about.
const FAILURES = [
  {
    kind: 'checks-failed',
    marker: FORCED_FAILURE_MARKERS.checksFailed,
    reasonAbout: /check/i
  },
  {
    kind: 'deploy-failed',
    marker: FORCED_FAILURE_MARKERS.deployFailed,
    reasonAbout: /deploy/i
  }
]

describe('Post-signin: a request that fails (AC4, AC7)', () => {
  before(async function () {
    skipUnlessConfigured(this, { needsMock: true })
    await SignInPage.signIn()
  })

  for (const { kind, marker, reasonAbout } of FAILURES) {
    it(`shows why a ${kind} request failed, and what the team can do`, async function () {
      this.timeout(journeyData.deployTimeoutMs + 60000)

      const { names } = await requestModels({
        teamSlug: journeyData.teamSlug,
        modelSlugs: [journeyData.failureModelSlug],
        purpose: `Journey test ${marker}`
      })

      await RequestPage.waitForOutcome(
        () => FailedPage.reason,
        journeyData.deployTimeoutMs
      )

      await expect(RequestPage.pageHeading).toHaveText(
        expect.stringContaining(`We could not set up ${names[0]}`)
      )
      expect((await FailedPage.reason.getText()).trim()).not.toBe('')

      // The AI Platform team's side: a reference to quote, and what failed.
      expect((await FailedPage.supportReference.getText()).trim()).toMatch(
        /^AIP-[A-Z0-9]{5}$/
      )
      await FailedPage.openTechnicalDetails()
      const details = await FailedPage.technicalDetails.getText()
      expect(details).toContain('What failed')
      expect(details).toMatch(reasonAbout)

      // The team's page says the same.
      await TeamModelsPage.open(journeyData.teamSlug)
      expect(await TeamModelsPage.statusOf(names[0])).toBe('Setup failed')
      expect(await TeamModelsPage.reasonOf(names[0])).not.toBe('')
    })
  }
})
