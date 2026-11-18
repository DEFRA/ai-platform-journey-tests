import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'
import { ENVIRONMENT } from '#support/deployments'
import { readEach } from '#support/element-values'

// The Deployments tab: each team's deployment in one environment at a time,
// found by team name, model, status and credential, with a tab for each
// environment. A GET form, so a filter is an address.
class AdminDeploymentsPage extends Page {
  // The list in the journeys' environment (JOURNEY_TEST_ENVIRONMENT), with any
  // other parameters of `query` (such as "?search=flood") kept. An environment
  // named in `query` is the one asked for.
  open(query = '') {
    const params = new URLSearchParams(query)

    if (!params.has('environment')) {
      params.set('environment', ENVIRONMENT)
    }

    return super.open(`/admin/deployments?${params}`)
  }

  get searchField() {
    return $('#search')
  }

  get modelSelect() {
    return $('#model')
  }

  get statusSelect() {
    return $('#status')
  }

  get credentialSelect() {
    return $('#credential')
  }

  get applyButton() {
    return $('[data-testid="deployments-apply"]')
  }

  get clearFiltersLink() {
    return $('[data-testid="deployments-clear"]')
  }

  get count() {
    return $('[data-testid="deployments-count"]')
  }

  get empty() {
    return $('[data-testid="deployments-empty"]')
  }

  get rows() {
    return $$('[data-testid="deployment-row"]')
  }

  get errorSummary() {
    return $('.govuk-error-summary')
  }

  // The tabs that choose the environment (the other tabs are the Admin area's).
  get environmentTabs() {
    return $('nav[aria-label="Environment"]')
  }

  environmentTab(label) {
    return this.environmentTabs.$(`a=${label}`)
  }

  get currentEnvironmentTab() {
    return this.environmentTabs.$('a[aria-current="page"]')
  }

  row(teamName) {
    return $(
      `//tr[@data-testid="deployment-row"][td[1]//a[normalize-space()="${teamName}"]]`
    )
  }

  teamLink(teamName) {
    return this.row(teamName).$('a')
  }

  // A cell of a team's row: Team, Models, Status, Credential or Last change.
  cell(teamName, column) {
    const index = ['Team', 'Models', 'Status', 'Credential', 'Last change']
    const position = index.indexOf(column) + 1

    return this.row(teamName).$(`./td[${position}]`)
  }

  async teamNames() {
    const rows = await this.rows.getElements()
    const names = await readEach(rows, (row) => row.$('a').getText())

    return names.map((name) => name.trim())
  }

  // Applies what is on the form: the choices named, by the text shown, then
  // waits for the page that answers (a GET form whose address holds them).
  async filterBy({ search, model, status, credential }) {
    if (search !== undefined) {
      await this.searchField.setValue(search)
    }

    if (model !== undefined) {
      await this.modelSelect.selectByVisibleText(model)
    }

    if (status !== undefined) {
      await this.statusSelect.selectByVisibleText(status)
    }

    if (credential !== undefined) {
      await this.credentialSelect.selectByVisibleText(credential)
    }

    await this.applyButton.click()
  }
}

export default new AdminDeploymentsPage()
