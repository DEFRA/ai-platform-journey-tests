import { $, $$, browser } from '@wdio/globals'
import { Page } from '#page-objects/page'

// The status filter's choices and what each puts in the address.
const STATUS_VALUES = {
  'All statuses': '',
  Active: 'active',
  Disabled: 'disabled',
  'Pending removal': 'pending-removal'
}

// The Admin area's Teams tab: every team, found by name or status.
class AdminTeamsPage extends Page {
  open(query = '') {
    return super.open(`/admin/teams${query}`)
  }

  get searchField() {
    return $('#search')
  }

  get statusSelect() {
    return $('#status')
  }

  get searchButton() {
    return $('[data-testid="teams-search"]')
  }

  get clearFiltersLink() {
    return $('[data-testid="teams-clear"]')
  }

  get count() {
    return $('[data-testid="teams-count"]')
  }

  get empty() {
    return $('[data-testid="teams-empty"]')
  }

  get rows() {
    return $$('[data-testid="team-row"]')
  }

  get errorSummary() {
    return $('.govuk-error-summary')
  }

  get nextPageLink() {
    return $('.govuk-pagination__next a')
  }

  teamLink(name) {
    return $(`//tr[@data-testid="team-row"]//a[normalize-space()="${name}"]`)
  }

  // The tag beside a team's name.
  status(name) {
    return $(
      `//tr[@data-testid="team-row"][td[1]//a[normalize-space()="${name}"]]/td[2]`
    )
  }

  async teamNames() {
    const names = []

    for (const row of await this.rows) {
      names.push((await row.$('a').getText()).trim())
    }

    return names
  }

  async search(text) {
    await this.searchField.setValue(text)
    await this.searchButton.click()
    await this.waitForQuery('search', text)
  }

  async filterByStatus(label) {
    await this.statusSelect.selectByVisibleText(label)
    await this.searchButton.click()
    await this.waitForQuery('status', STATUS_VALUES[label])
  }

  // A GET form loads the next page: wait for its address to hold the answer
  // before reading the page.
  waitForQuery(name, value) {
    return browser.waitUntil(
      async () =>
        new URL(await browser.getUrl()).searchParams.get(name) === value,
      { timeoutMsg: `Expected the address to hold ${name}=${value}` }
    )
  }
}

export default new AdminTeamsPage()
