import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// The confirmation after Disable credentials or Disable team: a panel that says
// what was done and where, what it means, and the way back.
class AdminActionDonePage extends Page {
  get panel() {
    return $('[data-testid="credentials-panel"]')
  }

  get panelTitle() {
    return $('[data-testid="credentials-panel"] .govuk-panel__title')
  }

  get effect() {
    return $('[data-testid="credentials-effect"]')
  }

  get backLink() {
    return $('[data-testid="credentials-back"]')
  }
}

export default new AdminActionDonePage()
