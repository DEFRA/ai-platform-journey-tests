import { $, $$ } from '@wdio/globals'
import { Page } from '#page-objects/page'
import { readEach } from '#support/element-values'

// One team's deployment in one environment, for a Platform Admin: its credential,
// its client secrets (each with a Revoke link) and the health of each model
// (each with Reconcile and, where one can be made, Retry).
class AdminDeploymentPage extends Page {
  get notification() {
    return $('[data-testid="team-notification"]')
  }

  get errorSummary() {
    return $('.govuk-error-summary')
  }

  get status() {
    return $('[data-testid="deployment-status"]')
  }

  get summary() {
    return $('[data-testid="deployment-summary"]')
  }

  get disableCredentialsButton() {
    return $('[data-testid="disable-credentials"]')
  }

  get enableCredentialsButton() {
    return $('[data-testid="enable-credentials"]')
  }

  get credentialActions() {
    return $('[data-testid="credential-actions"]')
  }

  get viewTeamLink() {
    return $('[data-testid="view-team"]')
  }

  get secretRows() {
    return $$('[data-testid="client-secret-row"]')
  }

  get modelRows() {
    return $$('[data-testid="model-row"]')
  }

  get environmentDisabled() {
    return $('[data-testid="environment-disabled"]')
  }

  // The value in the summary list beside a key such as "Credential".
  summaryValue(key) {
    return this.summary.$(
      `.//dt[normalize-space()="${key}"]/following-sibling::dd[1]`
    )
  }

  // A secret's row, by the end of its key shown as "Ending abcd".
  secretRow(keyHint) {
    return $(
      `//tr[@data-testid="client-secret-row"][td[1][normalize-space()="Ending ${keyHint}"]]`
    )
  }

  revokeLink(keyHint) {
    return this.secretRow(keyHint).$('[data-testid="revoke-secret"]')
  }

  // Each secret as the page shows it: { hint, expires, status, canRevoke }.
  async secrets() {
    const rows = await this.secretRows.getElements()

    return readEach(rows, async (row) => {
      const cells = await row.$$('td').getElements()
      const [hint, expires, status] = (
        await readEach(cells, (cell) => cell.getText())
      ).map((text) => text.trim())

      return {
        hint: hint.replace(/^Ending /, ''),
        expires,
        status,
        canRevoke: await row.$('[data-testid="revoke-secret"]').isExisting()
      }
    })
  }

  modelRow(modelName) {
    return $(
      `//tr[@data-testid="model-row"][td[1][normalize-space()="${modelName}"]]`
    )
  }

  // A button in a model's row: Reconcile or Retry.
  modelButton(modelName, text) {
    return this.modelRow(modelName).$(`button*=${text}`)
  }
}

export default new AdminDeploymentPage()
