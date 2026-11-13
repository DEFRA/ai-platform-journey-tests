import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// Where a team's request for models is followed: the steps in a polite live
// region, then the ready page or the page that says what went wrong.
class RequestProgressPage extends Page {
  get status() {
    return $('[data-testid="request-status"]')
  }

  get stepItems() {
    return $$('[data-testid="step-list-item"]')
  }

  get finished() {
    return $('[data-testid="request-finished"]')
  }

  get checkProgressLink() {
    return $('[data-testid="check-progress"]')
  }

  get readyPanel() {
    return $('[data-testid="ready-panel"]')
  }

  get failureReason() {
    return $('[data-testid="failure-reason"]')
  }
}

export default new RequestProgressPage()
