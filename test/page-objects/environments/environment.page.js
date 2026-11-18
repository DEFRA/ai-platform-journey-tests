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

  get addClientSecretButton() {
    return $('[data-testid="add-client-secret"]')
  }

  get clientSecretRows() {
    return $$('[data-testid="client-secret-row"]')
  }

  // The banner shown while a Platform Admin has disabled the team's credentials
  // here: what can and cannot be done, never why.
  get credentialsBanner() {
    return $('[data-testid="credentials-disabled-banner"]')
  }

  get credentialsBannerHeading() {
    return this.credentialsBanner.$('.govuk-notification-banner__heading')
  }

  get federateButton() {
    return $('[data-testid="federate-an-application"]')
  }

  // A client secret's action: a link when open, plain text when locked.
  clientSecretAction(action) {
    return $(`[data-testid="client-secret-${action}"]`)
  }

  clientSecretActionLocked(action) {
    return $(`[data-testid="client-secret-${action}-locked"]`)
  }

  get applicationRows() {
    return $$('[data-testid="application-row"]')
  }

  applicationRow(name) {
    return $(`[data-testid="application-row"]*=${name}`)
  }

  applicationAction(action) {
    return $(`[data-testid="application-${action}"]`)
  }

  applicationActionLocked(action) {
    return $(`[data-testid="application-${action}-locked"]`)
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
