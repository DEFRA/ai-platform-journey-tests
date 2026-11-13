import { $ } from '@wdio/globals'
import { Page } from '#page-objects/page'

// The confirm page before a person is removed from a team: what removing them
// leaves undone, the red Remove button and Cancel.
class AdminRemoveMemberPage extends Page {
  get warning() {
    return $('#remove-member')
  }

  get warningLink() {
    return $('[data-testid="remove-member-warning-link"]')
  }

  get confirmButton() {
    return $('[data-testid="remove-member-confirm"]')
  }

  get cancelLink() {
    return $('[data-testid="remove-member-cancel"]')
  }

  get errorSummary() {
    return $('.govuk-error-summary')
  }

  async confirm() {
    await this.confirmButton.click()
  }
}

export default new AdminRemoveMemberPage()
