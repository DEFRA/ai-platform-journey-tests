import { browser } from '@wdio/globals'
import { Page } from '#page-objects/page'

// The page that follows a team's request: `/connect/team/request/{team}/{id}`.
// While the request is being set up it shows the steps of each model in a
// polite live region (plan C6, P7-3). Every lookup takes the browser to use,
// so the same page object can read the second, script-free session.
class RequestPage extends Page {
  liveRegion(driver = browser) {
    return driver.$('[aria-live="polite"]')
  }

  stepItems(driver = browser) {
    return driver.$$('[data-testid="step-list-item"]')
  }

  metaRefresh(driver = browser) {
    return driver.$$('meta[http-equiv="refresh"]')
  }

  checkProgressLink(driver = browser) {
    return driver.$('a*=Check progress')
  }

  goToTeamLink(driver = browser) {
    return driver.$('a*=Go to')
  }

  /**
   * What the steps look like now: each step's state class, in order. A step
   * moving on changes it; the "last checked" time does not.
   * @param {WebdriverIO.Browser} [driver]
   * @returns {Promise<string>}
   */
  async progressSignature(driver = browser) {
    const items = await this.stepItems(driver)
    const classes = await Promise.all(
      items.map((item) => item.getAttribute('class'))
    )

    return classes.join('|')
  }

  /**
   * Waits for the page to reach an outcome, the way a person would: while
   * it is still being set up, press "Check progress" when it is on offer.
   * @param {() => ChainablePromiseElement} outcome - the element that shows it
   * @param {number} timeout - milliseconds
   */
  async waitForOutcome(outcome, timeout) {
    await browser.waitUntil(
      async () => {
        if (await outcome().isDisplayed()) {
          return true
        }

        const link = this.checkProgressLink()

        if (await link.isDisplayed()) {
          await link.click()
        }

        return false
      },
      {
        timeout,
        interval: 3000,
        timeoutMsg: `Expected the request to reach its outcome within ${timeout} ms`
      }
    )
  }
}

export default new RequestPage()
