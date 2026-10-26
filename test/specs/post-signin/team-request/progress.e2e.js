import { $, browser, expect } from '@wdio/globals'

import SignInPage from '#page-objects/sign-in.page'
import RequestPage from '#page-objects/team-request/request.page'
import { journeyData, skipUnlessConfigured } from '#support/journey-data'
import { openWithoutScript } from '#support/no-script-session'
import { requestModels } from '#support/team-request-journey'

const UPDATE_WITHIN_MS = 10000
// Longer than the page's 5 second refresh, so a refresh that should not happen
// has time to.
const NO_REFRESH_WAIT_MS = 6000
const FOCUS_MARKER = 'journey-test-same-page'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('Post-signin: progress of a request (AC10)', () => {
  before(async function () {
    skipUnlessConfigured(this)
    await SignInPage.signIn()
  })

  it('updates the steps in place with script, within 10 seconds, without moving focus', async function () {
    this.timeout(journeyData.deployTimeoutMs)

    await requestModels({
      teamSlug: journeyData.teamSlug,
      modelSlugs: [journeyData.progressModelSlug],
      purpose: 'Journey test: progress with script'
    })

    // A polite live region, and no meta refresh.
    await expect(RequestPage.liveRegion()).toBeExisting()
    expect(await RequestPage.liveRegion().getAttribute('aria-live')).toBe(
      'polite'
    )
    await expect(RequestPage.metaRefresh()).toBeElementsArrayOfSize(0)

    // Put focus on a link outside the region, and mark this page load: a
    // swap leaves both alone, a reload would clear them.
    const link = await RequestPage.goToTeamLink()
    await link.waitForDisplayed()
    await browser.execute(
      (element, marker) => {
        element.focus()
        globalThis.journeyTestMarker = marker
      },
      link,
      FOCUS_MARKER
    )

    const before = await RequestPage.progressSignature()

    await browser.waitUntil(
      async () => (await RequestPage.progressSignature()) !== before,
      {
        timeout: UPDATE_WITHIN_MS,
        interval: 500,
        timeoutMsg: `Expected the steps to change within ${UPDATE_WITHIN_MS} ms`
      }
    )

    expect(await browser.execute(() => globalThis.journeyTestMarker)).toBe(
      FOCUS_MARKER
    )
    await expect($('a*=Go to')).toBeFocused()
  })

  it('shows a "Check progress" link without script, and does not refresh by itself', async function () {
    this.timeout(journeyData.deployTimeoutMs)

    const { requestPath } = await requestModels({
      teamSlug: journeyData.teamSlug,
      modelSlugs: [journeyData.noScriptModelSlug],
      purpose: 'Journey test: progress without script'
    })

    const session = await openWithoutScript(requestPath)

    try {
      // Script really is off, as GOV.UK Frontend sets this class from script.
      await expect(session.$('body')).not.toHaveElementClass('js-enabled')

      await expect(RequestPage.checkProgressLink(session)).toBeDisplayed()
      await expect(RequestPage.metaRefresh(session)).toBeElementsArrayOfSize(0)

      // Nothing moves on its own, however long it is left.
      const before = await RequestPage.progressSignature(session)
      await sleep(NO_REFRESH_WAIT_MS)
      expect(await RequestPage.progressSignature(session)).toBe(before)

      // Pressing the link shows where the request has got to.
      await session.waitUntil(
        async () => {
          await RequestPage.checkProgressLink(session).click()

          return (await RequestPage.progressSignature(session)) !== before
        },
        {
          timeout: UPDATE_WITHIN_MS,
          interval: 1000,
          timeoutMsg: 'Expected "Check progress" to show newer progress'
        }
      )
    } finally {
      await session.deleteSession()
    }
  })
})
