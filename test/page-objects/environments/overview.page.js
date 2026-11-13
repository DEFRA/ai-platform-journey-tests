import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// A team's Environments overview: a card for each environment, then the
// changes in progress and the recent changes.
class OverviewPage extends Page {
  open(teamSlug) {
    return super.open(`/environments/${teamSlug}`)
  }

  get status() {
    return $('[data-testid="environments-status"]')
  }

  get deployButton() {
    return $('[data-testid="deploy-a-model"]')
  }

  card(environment) {
    return $(`[data-testid="environment-card-${environment}"]`)
  }

  cardLink(environment) {
    return this.card(environment).$('[data-testid="card-link"]')
  }

  get changesInProgress() {
    return $$('[data-testid="change-in-progress"]')
  }

  get noChangesInProgress() {
    return $('[data-testid="no-changes-in-progress"]')
  }

  get recentChanges() {
    return $$('[data-testid="recent-change"]')
  }
}

export default new OverviewPage()
