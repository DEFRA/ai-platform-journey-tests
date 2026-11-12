import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// One environment of a team: its changes in progress, models, limits and
// recent changes. The status is wrapped in a polite live region that the page
// refreshes while a change is open.
class EnvironmentPage extends Page {
  open(teamSlug, environment) {
    return super.open(`/environments/${teamSlug}/${environment}`)
  }

  get status() {
    return $('[data-testid="environment-status"]')
  }

  get tag() {
    return $('[data-testid="environment-tag"]')
  }

  get deployButton() {
    return $('[data-testid="deploy-a-model"]')
  }

  get inProgress() {
    return this.status.getAttribute('data-in-progress')
  }

  get changesInProgress() {
    return $$('[data-testid="change-in-progress"]')
  }

  get noChangesInProgress() {
    return $('[data-testid="no-changes-in-progress"]')
  }

  get stepItems() {
    return $$('[data-testid="step-list-item"]')
  }

  get checkProgressLink() {
    return $('[data-testid="check-progress"]')
  }

  get modelRows() {
    return $$('[data-testid="model-row"]')
  }

  modelRow(modelName) {
    return $(`[data-testid="model-row"]*=${modelName}`)
  }

  get limitsTokens() {
    return $('[data-testid="limits-row-tokens"] .govuk-summary-list__value')
  }

  get limitsRequests() {
    return $('[data-testid="limits-row-requests"] .govuk-summary-list__value')
  }

  get changeLimitsLink() {
    return $('[data-testid="change-limits"]')
  }

  get limitsPending() {
    return $('[data-testid="limits-pending"]')
  }

  get recentChanges() {
    return $$('[data-testid="recent-change"]')
  }

  recentChange(text) {
    return $(`[data-testid="recent-change"]*=${text}`)
  }

  get failure() {
    return $('[data-testid="failure"]')
  }

  get liveRegion() {
    return $('[aria-live="polite"][data-progress-refresh]')
  }
}

export default new EnvironmentPage()
